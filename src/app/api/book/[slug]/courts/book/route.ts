import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMinutes, parseISO } from "date-fns"
import { sendCourtBookingConfirmation } from "@/lib/email"

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json()
  const { courtId, date, time, duration = 60, clientName, clientEmail, clientPhone, notes, price = 0 } = body

  if (!courtId || !date || !time || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

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
    courtName: court?.name ?? courtId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    price,
    sponsorName: court?.sponsorName ?? undefined,
    sponsorLogo: court?.sponsorLogo ?? undefined,
    sponsorUrl: court?.sponsorUrl ?? undefined,
  }).catch(() => {})

  return NextResponse.json({ booking })
}
