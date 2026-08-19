import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendCourtBookingModification, sendCourtBookingCancellation } from "@/lib/email"
import { utcToChileLocal } from "@/lib/timezone"

type Params = { params: Promise<{ id: string; bookingId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, bookingId } = await params

  const [owner, member] = await Promise.all([
    prisma.business.findFirst({ where: { id, ownerId: session.user.id }, select: { id: true } }),
    prisma.businessMember.findFirst({ where: { businessId: id, userId: session.user.id, acceptedAt: { not: null } }, select: { id: true } }),
  ])
  if (!owner && !member) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const booking = await prisma.courtBooking.findUnique({
    where: { id: bookingId },
    include: {
      court: { select: { id: true, name: true, sport: true, color: true, isActive: true } },
      client: { select: { id: true, name: true, lastName: true, email: true, phone: true, rut: true } },
      coach: { select: { id: true, name: true, color: true } },
    },
  })
  if (!booking) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  return NextResponse.json(booking)
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, bookingId } = await params
  const { clientId, courtId, startTime, endTime, notes, status, price, coachPaid } = await req.json()

  try {
    const data: Record<string, unknown> = {}
    if (clientId !== undefined) data.clientId = clientId || null
    if (courtId !== undefined) data.courtId = courtId
    if (startTime !== undefined) data.startTime = new Date(startTime)
    if (endTime !== undefined) data.endTime = new Date(endTime)
    if (notes !== undefined) data.notes = notes || null
    if (status !== undefined) data.status = status
    if (price !== undefined) data.price = price
    if (coachPaid !== undefined) data.coachPaid = coachPaid

    // Validar duración mínima si cambia horario
    if (startTime !== undefined || endTime !== undefined) {
      const cur = await prisma.courtBooking.findUnique({ where: { id: bookingId }, select: { startTime: true, endTime: true } })
      const resolvedStart = startTime ? new Date(startTime) : cur?.startTime
      const resolvedEnd = endTime ? new Date(endTime) : cur?.endTime
      if (resolvedStart && resolvedEnd) {
        const durationMinutes = (resolvedEnd.getTime() - resolvedStart.getTime()) / (1000 * 60)
        const settings = await prisma.clubSettings.findUnique({ where: { businessId: id }, select: { slotMinutes: true } })
        const minMinutes = settings?.slotMinutes ?? 60
        if (durationMinutes < minMinutes) {
          return NextResponse.json({ error: `La duración mínima de reserva es ${minMinutes} minutos.` }, { status: 400 })
        }
      }
    }

    // Recalcular precio si cambia cancha o horario (y no viene precio explícito)
    if (price === undefined && (courtId !== undefined || startTime !== undefined || endTime !== undefined)) {
      const current = await prisma.courtBooking.findUnique({
        where: { id: bookingId },
        select: { courtId: true, startTime: true, endTime: true, coachId: true },
      })
      if (current) {
        const resolvedStart = startTime ? new Date(startTime) : current.startTime
        const resolvedEnd = endTime ? new Date(endTime) : current.endTime
        const startChile = utcToChileLocal(resolvedStart)
        const endChile = utcToChileLocal(resolvedEnd)
        const dayOfWeek = startChile.getDay()
        const durationHours = (resolvedEnd.getTime() - resolvedStart.getTime()) / (1000 * 60 * 60)

        if (current.coachId) {
          // Reserva con coach: recalcular según tarifas del entrenador en el nuevo horario
          const coach = await prisma.clubCoach.findUnique({
            where: { id: current.coachId },
            include: { feeRules: true },
          })
          if (coach) {
            const timeStr = `${String(startChile.getHours()).padStart(2, "0")}:${String(startChile.getMinutes()).padStart(2, "0")}`
            const feeRule = coach.feeRules.find(r =>
              r.days.map(Number).includes(dayOfWeek) && timeStr >= r.startTime && timeStr < r.endTime
            )
            if (feeRule) data.price = Number(feeRule.classPrice) * durationHours
          }
        } else {
          // Reserva sin coach: recalcular proporcional según tarifas de la cancha
          const resolvedCourtId = courtId ?? current.courtId
          const court = await prisma.court.findUnique({ where: { id: resolvedCourtId }, include: { pricingRules: true } })
          if (court) {
            const holiday = await prisma.clubHoliday.findFirst({
              where: { businessId: id, date: { gte: new Date(startChile.toDateString()), lt: new Date(new Date(startChile.toDateString()).getTime() + 86400000) }, type: "SURCHARGE" },
            })
            let calculatedPrice = 0
            let cursor = new Date(startChile)
            const endChileCursor = endChile
            while (cursor < endChileCursor) {
              const timeStr = `${String(cursor.getHours()).padStart(2, "0")}:${String(cursor.getMinutes()).padStart(2, "0")}`
              const rule = court.pricingRules.find(r =>
                r.days.includes(dayOfWeek) && timeStr >= r.startTime && timeStr < r.endTime
              )
              if (!rule) { cursor = new Date(cursor.getTime() + 60 * 1000); continue }
              const [reh, rem] = rule.endTime.split(":").map(Number)
              const ruleEnd = new Date(cursor); ruleEnd.setHours(reh, rem, 0, 0)
              const segEnd = ruleEnd < endChileCursor ? ruleEnd : endChileCursor
              calculatedPrice += Number(rule.price) * ((segEnd.getTime() - cursor.getTime()) / (1000 * 60 * 60))
              cursor = segEnd
            }
            if (holiday?.surchargeValue) {
              if (holiday.surchargeType === "PERCENT") calculatedPrice *= (1 + holiday.surchargeValue / 100)
              else if (holiday.surchargeType === "FIXED") calculatedPrice += holiday.surchargeValue
            }
            if (calculatedPrice > 0) data.price = calculatedPrice
          }
        }
      }
    }

    // Validar solapamiento y fixed slots si cambia horario o cancha
    if (startTime !== undefined || endTime !== undefined || courtId !== undefined) {
      const current = await prisma.courtBooking.findUnique({ where: { id: bookingId }, select: { courtId: true, startTime: true, endTime: true } })
      if (current) {
        const resolvedCourtId = courtId ?? current.courtId
        const resolvedStart = data.startTime as Date ?? current.startTime
        const resolvedEnd = data.endTime as Date ?? current.endTime
        const conflict = await prisma.courtBooking.findFirst({
          where: {
            courtId: resolvedCourtId,
            deletedAt: null,
            status: { not: "CANCELLED" },
            id: { not: bookingId },
            OR: [
              { startTime: { gte: resolvedStart, lt: resolvedEnd } },
              { endTime: { gt: resolvedStart, lte: resolvedEnd } },
              { startTime: { lte: resolvedStart }, endTime: { gte: resolvedEnd } },
            ],
          },
        })
        if (conflict) return NextResponse.json({ error: "La cancha ya tiene una reserva en ese horario" }, { status: 409 })

        // Validate fixed slots + time range
        const resolvedCourt = await prisma.court.findUnique({ where: { id: resolvedCourtId }, include: { pricingRules: true } })
        if (resolvedCourt) {
          const sChile = utcToChileLocal(resolvedStart)
          const eChile = utcToChileLocal(resolvedEnd)
          const sStr = `${String(sChile.getHours()).padStart(2, "0")}:${String(sChile.getMinutes()).padStart(2, "0")}`
          const eStr = `${String(eChile.getHours()).padStart(2, "0")}:${String(eChile.getMinutes()).padStart(2, "0")}`
          const dow = sChile.getDay()
          if (resolvedCourt.pricingRules.length > 0 && !resolvedCourt.pricingRules.some(r => r.days.includes(dow))) {
            return NextResponse.json({ error: "Esta cancha no está disponible para reservas ese día." }, { status: 400 })
          }
          const dayRules = resolvedCourt.pricingRules.filter(r => r.days.includes(dow))
          if (dayRules.length > 0) {
            let cursor = sStr
            let covered = true
            while (cursor < eStr) {
              const rule = dayRules.find(r => cursor >= r.startTime && cursor < r.endTime)
              if (!rule) { covered = false; break }
              cursor = rule.endTime < eStr ? rule.endTime : eStr
            }
            if (!covered) return NextResponse.json({ error: "El horario seleccionado está fuera del horario disponible de esta cancha." }, { status: 400 })
          }
          for (const rule of resolvedCourt.pricingRules) {
            if (!rule.fixedSlots?.length || !rule.days.includes(dow)) continue
            const fs = rule.fixedSlots
            for (let i = 0; i < fs.length - 1; i++) {
              const slotStart = fs[i], slotEnd = fs[i + 1]
              if (sStr < slotEnd && eStr > slotStart && (sStr !== slotStart || eStr !== slotEnd)) {
                return NextResponse.json({ error: `El horario ${slotStart}–${slotEnd} es un bloque fijo. Debes reservar ese bloque completo.` }, { status: 400 })
              }
            }
          }
        }
      }
    }

    const booking = await prisma.courtBooking.update({
      where: { id: bookingId, businessId: id },
      data,
      include: {
        court: { select: { id: true, name: true, sport: true, color: true } },
        client: { select: { id: true, name: true, email: true, phone: true, rut: true } },
      },
    })

    // Auto-marcar coachPaid al completar si el coach trabaja a COURT_FEE
    if (status === "COMPLETED" && booking.coachId) {
      await prisma.courtBooking.update({ where: { id: bookingId }, data: { coachPaid: true } })
    }

    // Crear o actualizar Payment al completar
    if (status === "COMPLETED") {
      await prisma.payment.upsert({
        where: { courtBookingId: bookingId },
        create: {
          courtBookingId: bookingId,
          amount: booking.price,
          status: "PAID",
          method: "CASH",
          paidAt: new Date(),
        },
        update: {
          amount: booking.price,
          status: "PAID",
          paidAt: new Date(),
        },
      })
    }

    // Email de modificación si cambió horario/cancha y hay cliente con email
    const timeChanged = startTime !== undefined || endTime !== undefined || courtId !== undefined
    if (timeChanged && booking.client?.email && status === undefined) {
      const business = await prisma.business.findUnique({ where: { id }, select: { name: true } })
      sendCourtBookingModification({
        clientName: booking.client.name,
        clientEmail: booking.client.email,
        businessName: business?.name ?? "Club Deportivo",
        courtName: booking.court.name,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        price: Number(booking.price),
      }).catch(console.error)
    }

    return NextResponse.json({ booking })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, bookingId } = await params
  const silent = new URL(req.url).searchParams.get("silent") === "1"

  const booking = await prisma.courtBooking.update({
    where: { id: bookingId, businessId: id },
    data: { deletedAt: new Date(), status: "CANCELLED" },
    include: {
      court: { select: { name: true } },
      client: { select: { name: true, email: true } },
    },
  })

  if (!silent && booking.client?.email) {
    const business = await prisma.business.findUnique({ where: { id }, select: { name: true } })
    sendCourtBookingCancellation({
      clientName: booking.client.name,
      clientEmail: booking.client.email,
      businessName: business?.name ?? "Club Deportivo",
      courtName: booking.court.name,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
    }).catch(console.error)
  }

  return NextResponse.json({ success: true })
}
