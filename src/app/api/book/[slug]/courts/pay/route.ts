import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessCreatePayment } from "@/lib/flow"
import { addMinutes, parseISO } from "date-fns"
import { sendCourtBookingConfirmation } from "@/lib/email"

type Params = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true,
      flowApiKey: true, flowSecretKey: true, onlinePaymentsEnabled: true,
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
    price = 0, paymentPlayers = 1,
  } = body

  if (!courtId || !date || !time || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const startTime = parseISO(`${date}T${time}`)
  const endTime = addMinutes(startTime, duration)

  // Check availability
  const conflict = await prisma.courtBooking.findFirst({
    where: {
      courtId,
      status: { notIn: ["CANCELLED"] },
      deletedAt: null,
      OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
    },
  })
  if (conflict) return NextResponse.json({ error: "Horario no disponible" }, { status: 409 })

  // Find or create client
  let client = await prisma.client.findFirst({
    where: { businessId: business.id, email: clientEmail },
  })
  if (!client) {
    client = await prisma.client.create({
      data: { businessId: business.id, name: clientName, email: clientEmail, phone: clientPhone || null },
    })
  }

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { name: true, sponsorName: true, sponsorLogo: true, sponsorUrl: true },
  })

  // Amount the client actually pays (their share)
  const clientAmount = Math.round(Number(price) / Math.max(1, Number(paymentPlayers)))

  // Create booking in PENDING_PAYMENT status
  const booking = await prisma.courtBooking.create({
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

  const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"
  const commerceOrder = `court_${booking.id}_${Date.now()}`

  try {
    const result = await businessCreatePayment(
      business.flowApiKey,
      business.flowSecretKey,
      {
        commerceOrder,
        subject: `Cancha ${court?.name ?? ""} — ${business.name}`,
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
