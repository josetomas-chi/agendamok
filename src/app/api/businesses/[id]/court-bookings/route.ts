import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const bookings = await prisma.courtBooking.findMany({
    where: {
      businessId: id,
      deletedAt: null,
      status: { not: "CANCELLED" },
      ...(from && to && { startTime: { gte: new Date(from), lte: new Date(to) } }),
    },
    include: {
      court: { select: { id: true, name: true, sport: true, color: true } },
      client: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { startTime: "asc" },
  })
  return NextResponse.json({ bookings })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { courtId, clientId, startTime, endTime, notes } = body

  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  // Calculate price from pricing rules
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { pricingRules: true },
  })
  if (!court) return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 })

  const dayOfWeek = start.getDay() // 0=Sunday
  const timeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`

  let pricePerHour = 0
  for (const rule of court.pricingRules) {
    if (rule.days.includes(dayOfWeek) && timeStr >= rule.startTime && timeStr < rule.endTime) {
      pricePerHour = Number(rule.price)
      break
    }
  }

  const price = pricePerHour * durationHours

  const booking = await prisma.courtBooking.create({
    data: { businessId: id, courtId, clientId: clientId || null, startTime: start, endTime: end, price, notes, status: "CONFIRMED" },
    include: {
      court: { select: { id: true, name: true, sport: true, color: true } },
      client: { select: { id: true, name: true, email: true, phone: true } },
    },
  })
  return NextResponse.json({ booking }, { status: 201 })
}
