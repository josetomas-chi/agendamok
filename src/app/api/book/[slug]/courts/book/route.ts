import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { addMinutes, parseISO } from "date-fns"
import { sendCourtBookingConfirmation } from "@/lib/email"

const PENDING_EXPIRY_MS = 15 * 60 * 1000

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

function getAuthoritativePrice(
  pricingRules: { days: unknown; startTime: string | null; endTime: string | null; price: unknown; fixedSlots: unknown }[],
  dateStr: string,
  timeStr: string,
  requestedDuration: number,
): { price: number; durationError?: string } {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dayOfWeek = DAY_NAMES[new Date(y, m - 1, d).getDay()]

  const rule = pricingRules.find((r) => {
    const days = r.days as string[]
    if (!days.includes(dayOfWeek)) return false
    if (r.startTime && timeStr < r.startTime) return false
    if (r.endTime && timeStr >= r.endTime) return false
    return true
  })
  if (!rule) return { price: 0 }

  const fixedSlots = rule.fixedSlots as string[] | null
  if (fixedSlots?.length) {
    if (!fixedSlots.includes(timeStr)) return { price: 0, durationError: "Horario inválido para esta cancha" }
    const idx = fixedSlots.indexOf(timeStr)
    if (idx < fixedSlots.length - 1) {
      const [nh, nm] = fixedSlots[idx + 1].split(":").map(Number)
      const [ch, cm] = timeStr.split(":").map(Number)
      const slotMin = (nh * 60 + nm) - (ch * 60 + cm)
      if (requestedDuration !== slotMin) return { price: 0, durationError: `La duración debe ser ${slotMin} minutos` }
    }
  }

  return { price: Number(rule.price) }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json()
  const { courtId, date, time, duration = 60, clientName, clientEmail, clientPhone, clientRut, notes } = body

  if (!courtId || !date || !time || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, name: true, clubSettings: { select: { bookingWindowDays: true } } },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const startTime = parseISO(`${date}T${time}`)
  const endTime = addMinutes(startTime, duration)

  if (startTime <= new Date()) {
    return NextResponse.json({ error: "No se puede reservar en el pasado" }, { status: 400 })
  }
  const windowDays = business.clubSettings?.bookingWindowDays ?? 30
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + windowDays)
  if (startTime > maxDate) {
    return NextResponse.json({ error: `Solo se puede reservar con hasta ${windowDays} días de anticipación` }, { status: 400 })
  }

  // Load court and validate it belongs to this business
  const court = await prisma.court.findFirst({
    where: { id: courtId, businessId: business.id, isActive: true },
    select: {
      name: true, sponsorName: true, sponsorLogo: true, sponsorUrl: true,
      pricingRules: { select: { days: true, startTime: true, endTime: true, price: true, fixedSlots: true } },
    },
  })
  if (!court) return NextResponse.json({ error: "Cancha no disponible" }, { status: 404 })

  // Server-side price calculation
  const { price, durationError } = getAuthoritativePrice(court.pricingRules, date, time, Number(duration))
  if (durationError) return NextResponse.json({ error: durationError }, { status: 400 })

  // Check availability (treat PENDING older than 30 min as expired)
  const expiryThreshold = new Date(Date.now() - PENDING_EXPIRY_MS)
  const conflict = await prisma.courtBooking.findFirst({
    where: {
      courtId,
      deletedAt: null,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      OR: [
        { status: { notIn: ["CANCELLED", "PENDING"] } },
        { status: "PENDING", createdAt: { gte: expiryThreshold } },
      ],
    },
  })
  if (conflict) return NextResponse.json({ error: "Horario no disponible" }, { status: 409 })

  // Find or create client
  const session = await auth()
  const loggedUser = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
    : null

  let client = await prisma.client.findFirst({
    where: { businessId: business.id, email: clientEmail, deletedAt: null },
  })
  if (!client) {
    client = await prisma.client.create({
      data: { businessId: business.id, name: clientName, email: clientEmail, phone: clientPhone || null, rut: clientRut || null, ...(loggedUser ? { userId: loggedUser.id } : {}) },
    })
  } else {
    const updates: Record<string, unknown> = {}
    if (loggedUser && !client.userId) updates.userId = loggedUser.id
    if (clientRut && !client.rut) updates.rut = clientRut
    if (Object.keys(updates).length > 0)
      client = await prisma.client.update({ where: { id: client.id }, data: updates })
  }

  const booking = await prisma.courtBooking.create({
    data: {
      businessId: business.id,
      courtId,
      clientId: client.id,
      startTime,
      endTime,
      price,
      notes: notes || null,
      status: "CONFIRMED",
    },
  })

  // Send confirmation email (non-blocking)
  sendCourtBookingConfirmation({
    clientName,
    clientEmail,
    businessName: business.name,
    courtName: court.name,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    price,
    sponsorName: court.sponsorName ?? undefined,
    sponsorLogo: court.sponsorLogo ?? undefined,
    sponsorUrl: court.sponsorUrl ?? undefined,
  }).catch(() => {})

  return NextResponse.json({ booking, allowTransfer: client.allowTransfer })
}
