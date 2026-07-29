import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessCreatePayment } from "@/lib/flow"
import { addMinutes, parseISO } from "date-fns"
import { sendCourtBookingConfirmation } from "@/lib/email"

type Params = { params: Promise<{ slug: string }> }

const PENDING_EXPIRY_MS = 15 * 60 * 1000

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

function getAuthoritativePrice(
  pricingRules: { days: unknown; startTime: string | null; endTime: string | null; price: unknown; fixedSlots: unknown }[],
  dateStr: string,
  timeStr: string,
  requestedDuration: number,
): { price: number; error?: string } {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dayOfWeek = DAY_NAMES[new Date(y, m - 1, d).getDay()]

  const rule = pricingRules.find((r) => {
    const days = r.days as string[]
    if (!days.includes(dayOfWeek)) return false
    if (r.startTime && timeStr < r.startTime) return false
    if (r.endTime && timeStr >= r.endTime) return false
    return true
  })
  if (!rule) return { price: 0, error: "No hay tarifa configurada para este horario" }

  const fixedSlots = rule.fixedSlots as string[] | null
  if (fixedSlots?.length) {
    if (!fixedSlots.includes(timeStr)) return { price: 0, error: "Horario inválido para esta cancha" }
    const idx = fixedSlots.indexOf(timeStr)
    if (idx < fixedSlots.length - 1) {
      const [nh, nm] = fixedSlots[idx + 1].split(":").map(Number)
      const [ch, cm] = timeStr.split(":").map(Number)
      const slotMin = (nh * 60 + nm) - (ch * 60 + cm)
      if (requestedDuration !== slotMin) return { price: 0, error: `La duración debe ser ${slotMin} minutos` }
    }
  }

  return { price: Number(rule.price) }
}

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true,
      flowApiKey: true, flowSecretKey: true, onlinePaymentsEnabled: true,
      clubSettings: { select: { bookingWindowDays: true } },
    },
  })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  if (!business.onlinePaymentsEnabled || !business.flowApiKey || !business.flowSecretKey) {
    return NextResponse.json({ error: "Pagos online no habilitados" }, { status: 400 })
  }

  const body = await req.json()
  const {
    courtId, date, time, duration = 60,
    clientName, clientEmail, clientPhone, notes,
    paymentPlayers = 1,
  } = body

  if (!courtId || !date || !time || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

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

  // Server-side price calculation — never trust the client's price
  const { price, error: priceError } = getAuthoritativePrice(court.pricingRules, date, time, Number(duration))
  if (priceError) return NextResponse.json({ error: priceError }, { status: 400 })

  // Find or create client (outside transaction — not part of the critical section)
  let client = await prisma.client.findFirst({
    where: { businessId: business.id, email: clientEmail, deletedAt: null },
  })
  if (!client) {
    client = await prisma.client.create({
      data: { businessId: business.id, name: clientName, email: clientEmail, phone: clientPhone || null },
    })
  }

  // Amount each player pays (their share of the total)
  const clientAmount = Math.round(price / Math.max(1, Number(paymentPlayers)))

  // Atomic: check availability + create PENDING booking in a serializable transaction
  const expiryThreshold = new Date(Date.now() - PENDING_EXPIRY_MS)
  let booking: { id: string } | null = null
  try {
    booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.courtBooking.findFirst({
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
      if (conflict) return null

      return tx.courtBooking.create({
        data: {
          businessId: business.id,
          courtId,
          clientId: client.id,
          startTime,
          endTime,
          price,
          notes: notes || null,
          status: "PENDING",
        },
      })
    }, { isolationLevel: "Serializable" })
  } catch {
    return NextResponse.json({ error: "Horario no disponible" }, { status: 409 })
  }

  if (!booking) return NextResponse.json({ error: "Horario no disponible" }, { status: 409 })

  const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"
  const commerceOrder = `court_${booking.id}_${Date.now()}`

  try {
    const result = await businessCreatePayment(
      business.flowApiKey,
      business.flowSecretKey,
      {
        commerceOrder,
        subject: `Cancha ${court.name} — ${business.name}`,
        amount: clientAmount,
        email: clientEmail,
        urlReturn: `${baseUrl}/book/${slug}/pay-court-return?orderId=${commerceOrder}&bookingId=${booking.id}`,
        urlConfirmation: `${baseUrl}/api/book/${slug}/courts/pay-webhook`,
      }
    )

    // Store the commerce order so we can reconcile on webhook
    await prisma.courtBooking.update({
      where: { id: booking.id },
      data: { notes: `[flow:${commerceOrder}] ${notes || ""}`.trim() },
    })

    return NextResponse.json({ url: result.url, token: result.token, bookingId: booking.id })
  } catch (err) {
    // Roll back the pending booking on Flow error
    await prisma.courtBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } })
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
