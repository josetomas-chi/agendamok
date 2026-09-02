import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendCourtBookingConfirmation } from "@/lib/email"
import { calcCourtPrice } from "@/lib/pricing"
import { utcToChileLocal } from "@/lib/timezone"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const statusFilter = searchParams.get("status")
  const bookings = await prisma.courtBooking.findMany({
    where: {
      businessId: id,
      deletedAt: null,
      status: statusFilter ? statusFilter : { not: "CANCELLED" },
      ...(from && to && { startTime: { gte: new Date(from), lte: new Date(to) } }),
    },
    include: {
      court: { select: { id: true, name: true, sport: true, color: true } },
      client: { select: { id: true, name: true, lastName: true, email: true, phone: true, rut: true } },
      coach: { select: { id: true, name: true, color: true } },
      payment: { select: { amount: true, method: true, paidAt: true } },
    },
    orderBy: { startTime: "desc" },
  })
  return NextResponse.json({ bookings })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { courtId, clientId, startTime, endTime, notes, coachId, blockType } = body
  const isBlock = blockType === "BLOCK"

  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
  const durationHours = durationMinutes / 60

  // Calculate price from pricing rules
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { pricingRules: true },
  })
  if (!court) return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 })

  const startChile = utcToChileLocal(start)
  const endChile = utcToChileLocal(end)
  const dayOfWeek = startChile.getDay()
  const timeStr = `${String(startChile.getHours()).padStart(2, "0")}:${String(startChile.getMinutes()).padStart(2, "0")}`
  const endTimeStr = `${String(endChile.getHours()).padStart(2, "0")}:${String(endChile.getMinutes()).padStart(2, "0")}`

  if (!isBlock) {
    // Validar que la cancha esté disponible ese día de la semana
    if (court.pricingRules.length > 0 && !court.pricingRules.some(r => r.days.includes(dayOfWeek))) {
      return NextResponse.json({ error: "Esta cancha no está disponible para reservas ese día." }, { status: 400 })
    }

    // Validar que el horario esté cubierto por la unión de reglas activas ese día
    const dayRules = court.pricingRules.filter(r => r.days.includes(dayOfWeek))
    if (dayRules.length > 0) {
      let cursor = timeStr
      let covered = true
      while (cursor < endTimeStr) {
        const rule = dayRules.find(r => cursor >= r.startTime && cursor < r.endTime)
        if (!rule) { covered = false; break }
        cursor = rule.endTime < endTimeStr ? rule.endTime : endTimeStr
      }
      if (!covered) {
        return NextResponse.json({ error: "El horario seleccionado está fuera del horario disponible de esta cancha." }, { status: 400 })
      }
    }

    // Validar duración mínima
    const settings = await prisma.clubSettings.findUnique({ where: { businessId: id }, select: { slotMinutes: true } })
    const minMinutes = settings?.slotMinutes ?? 60
    if (durationMinutes < minMinutes) {
      return NextResponse.json({ error: `La duración mínima de reserva es ${minMinutes} minutos.` }, { status: 400 })
    }

    // Validate fixed slots
    for (const rule of court.pricingRules) {
      if (!rule.fixedSlots?.length || !rule.days.includes(dayOfWeek)) continue
      const fs = rule.fixedSlots
      for (let i = 0; i < fs.length - 1; i++) {
        const slotStart = fs[i]
        const slotEnd = fs[i + 1]
        const overlaps = timeStr < slotEnd && endTimeStr > slotStart
        if (overlaps && (timeStr !== slotStart || endTimeStr !== slotEnd)) {
          return NextResponse.json({
            error: `El horario ${slotStart}–${slotEnd} es un bloque fijo. Debes reservar ese bloque completo.`,
          }, { status: 400 })
        }
      }
    }
  }

  // Validar solapamiento (aplica siempre, incluso para bloqueos)
  const conflict = await prisma.courtBooking.findFirst({
    where: {
      courtId,
      deletedAt: null,
      status: { not: "CANCELLED" },
      OR: [
        { startTime: { gte: start, lt: end } },
        { endTime: { gt: start, lte: end } },
        { startTime: { lte: start }, endTime: { gte: end } },
      ],
    },
  })
  if (conflict) return NextResponse.json({ error: "La cancha ya está bloqueada u ocupada en ese horario" }, { status: 409 })

  let price = 0

  if (!isBlock) {
    if (coachId) {
      const coach = await prisma.clubCoach.findUnique({ where: { id: coachId }, include: { feeRules: true } })
      if (coach) {
        const rule = coach.feeRules.find(r => r.days.includes(startChile.getDay()) && timeStr >= r.startTime && timeStr < r.endTime)
        if (rule) price = Number(rule.classPrice) * durationHours
      }
    } else {
      const holiday = await prisma.clubHoliday.findFirst({
        where: { businessId: id, date: { gte: new Date(start.toDateString()), lt: new Date(new Date(start.toDateString()).getTime() + 86400000) }, type: "SURCHARGE" },
      })
      price = calcCourtPrice(court.pricingRules, startChile, endChile, holiday)
    }
  }

  const booking = await prisma.courtBooking.create({
    data: { businessId: id, courtId, clientId: isBlock ? null : (clientId || null), coachId: coachId || null, startTime: start, endTime: end, price, notes, status: "CONFIRMED", blockType: blockType || "BOOKING" },
    include: {
      court: { select: { id: true, name: true, sport: true, color: true, sponsorName: true, sponsorLogo: true, sponsorUrl: true } },
      client: { select: { id: true, name: true, lastName: true, email: true, phone: true, rut: true } },
      coach: { select: { id: true, name: true, color: true } },
    },
  })
  if (!isBlock && booking.client?.email) {
    const business = await prisma.business.findUnique({ where: { id }, select: { name: true } })
    sendCourtBookingConfirmation({
      clientName: booking.client.name,
      clientEmail: booking.client.email,
      businessName: business?.name ?? "Club Deportivo",
      courtName: booking.court.name,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      price: Number(booking.price),
      coachName: booking.coach?.name ?? undefined,
      sponsorName: booking.court.sponsorName ?? undefined,
      sponsorLogo: booking.court.sponsorLogo ?? undefined,
      sponsorUrl: booking.court.sponsorUrl ?? undefined,
    }).catch(console.error)
  }

  return NextResponse.json({ booking }, { status: 201 })
}
