import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendCourtBookingConfirmation } from "@/lib/email"

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
      client: { select: { id: true, name: true, email: true, phone: true } },
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
  const { courtId, clientId, startTime, endTime, notes, coachId } = body

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

  // Validar duración mínima
  const settings = await prisma.clubSettings.findUnique({ where: { businessId: id }, select: { slotMinutes: true } })
  const minMinutes = settings?.slotMinutes ?? 60
  if (durationMinutes < minMinutes) {
    return NextResponse.json({ error: `La duración mínima de reserva es ${minMinutes} minutos.` }, { status: 400 })
  }

  // Validar solapamiento
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
  if (conflict) return NextResponse.json({ error: "La cancha ya tiene una reserva en ese horario" }, { status: 409 })

  const dayOfWeek = start.getDay()
  const timeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
  const endTimeStr = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`

  // Validate fixed slots: a booking cannot partially overlap a rigid block
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

  let price = 0

  if (coachId) {
    // Clase particular: precio basado en tarifas del entrenador
    const coach = await prisma.clubCoach.findUnique({
      where: { id: coachId },
      include: { feeRules: true },
    })
    if (coach) {
      const rule = coach.feeRules.find(r => r.days.includes(dayOfWeek) && timeStr >= r.startTime && timeStr < r.endTime)
      if (rule) price = Number(rule.classPrice) * durationHours
    }
  } else {
    // Reserva común: precio basado en tarifas de la cancha
    let pricePerHour = 0
    for (const rule of court.pricingRules) {
      if (rule.days.includes(dayOfWeek) && timeStr >= rule.startTime && timeStr < rule.endTime) {
        pricePerHour = Number(rule.price)
        break
      }
    }
    price = pricePerHour * durationHours

    // Aplicar recargo si el día es feriado (solo reservas sin profe)
    const holiday = await prisma.clubHoliday.findFirst({
      where: { businessId: id, date: { gte: new Date(start.toDateString()), lt: new Date(new Date(start.toDateString()).getTime() + 86400000) }, type: "SURCHARGE" },
    })
    if (holiday && holiday.surchargeValue) {
      if (holiday.surchargeType === "PERCENT") price = price * (1 + holiday.surchargeValue / 100)
      else if (holiday.surchargeType === "FIXED") price = price + holiday.surchargeValue
    }
  }

  const booking = await prisma.courtBooking.create({
    data: { businessId: id, courtId, clientId: clientId || null, coachId: coachId || null, startTime: start, endTime: end, price, notes, status: "CONFIRMED" },
    include: {
      court: { select: { id: true, name: true, sport: true, color: true, sponsorName: true, sponsorLogo: true, sponsorUrl: true } },
      client: { select: { id: true, name: true, email: true, phone: true } },
      coach: { select: { id: true, name: true, color: true } },
    },
  })
  if (booking.client?.email) {
    const business = await prisma.business.findUnique({ where: { id }, select: { name: true } })
    sendCourtBookingConfirmation({
      clientName: booking.client.name,
      clientEmail: booking.client.email,
      businessName: business?.name ?? "Club Deportivo",
      courtName: booking.court.name,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      price: Number(booking.price),
      sponsorName: booking.court.sponsorName ?? undefined,
      sponsorLogo: booking.court.sponsorLogo ?? undefined,
      sponsorUrl: booking.court.sponsorUrl ?? undefined,
    }).catch(console.error)
  }

  return NextResponse.json({ booking }, { status: 201 })
}
