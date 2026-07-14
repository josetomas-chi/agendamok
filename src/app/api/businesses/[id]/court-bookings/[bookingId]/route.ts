import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendCourtBookingModification, sendCourtBookingCancellation } from "@/lib/email"

type Params = { params: Promise<{ id: string; bookingId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, bookingId } = await params
  const { clientId, courtId, startTime, endTime, notes, status, price } = await req.json()

  try {
    const data: Record<string, unknown> = {}
    if (clientId !== undefined) data.clientId = clientId || null
    if (courtId !== undefined) data.courtId = courtId
    if (startTime !== undefined) data.startTime = new Date(startTime)
    if (endTime !== undefined) data.endTime = new Date(endTime)
    if (notes !== undefined) data.notes = notes || null
    if (status !== undefined) data.status = status
    if (price !== undefined) data.price = price

    // Recalcular precio si cambia cancha o horario (y no viene precio explícito)
    if (price === undefined && (courtId !== undefined || startTime !== undefined || endTime !== undefined)) {
      const current = await prisma.courtBooking.findUnique({ where: { id: bookingId }, select: { courtId: true, startTime: true, endTime: true } })
      if (current) {
        const resolvedCourtId = courtId ?? current.courtId
        const resolvedStart = startTime ? new Date(startTime) : current.startTime
        const resolvedEnd = endTime ? new Date(endTime) : current.endTime
        const court = await prisma.court.findUnique({ where: { id: resolvedCourtId }, include: { pricingRules: true } })
        if (court) {
          const dayOfWeek = resolvedStart.getDay()
          const timeStr = `${String(resolvedStart.getHours()).padStart(2, "0")}:${String(resolvedStart.getMinutes()).padStart(2, "0")}`
          const durationHours = (resolvedEnd.getTime() - resolvedStart.getTime()) / (1000 * 60 * 60)
          const rule = court.pricingRules.find(r => r.days.includes(dayOfWeek) && timeStr >= r.startTime && timeStr < r.endTime)
          if (rule) {
            let calculatedPrice = Number(rule.price) * durationHours
            const holiday = await prisma.clubHoliday.findFirst({
              where: { businessId: id, date: { gte: new Date(resolvedStart.toDateString()), lt: new Date(new Date(resolvedStart.toDateString()).getTime() + 86400000) }, type: "SURCHARGE" },
            })
            if (holiday?.surchargeValue) {
              if (holiday.surchargeType === "PERCENT") calculatedPrice = calculatedPrice * (1 + holiday.surchargeValue / 100)
              else if (holiday.surchargeType === "FIXED") calculatedPrice = calculatedPrice + holiday.surchargeValue
            }
            data.price = calculatedPrice
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

        // Validate fixed slots
        const resolvedCourt = await prisma.court.findUnique({ where: { id: resolvedCourtId }, include: { pricingRules: true } })
        if (resolvedCourt) {
          const sStr = `${String(resolvedStart.getHours()).padStart(2, "0")}:${String(resolvedStart.getMinutes()).padStart(2, "0")}`
          const eStr = `${String(resolvedEnd.getHours()).padStart(2, "0")}:${String(resolvedEnd.getMinutes()).padStart(2, "0")}`
          const dow = resolvedStart.getDay()
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
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
    })

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

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, bookingId } = await params

  const booking = await prisma.courtBooking.update({
    where: { id: bookingId, businessId: id },
    data: { deletedAt: new Date(), status: "CANCELLED" },
    include: {
      court: { select: { name: true } },
      client: { select: { name: true, email: true } },
    },
  })

  if (booking.client?.email) {
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
