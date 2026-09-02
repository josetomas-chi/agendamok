import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const rut = searchParams.get("rut")?.trim()
  const email = searchParams.get("email")?.trim()

  if (!rut && !email) return NextResponse.json({ error: "Falta rut o email" }, { status: 400 })

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true,
      clubSettings: { select: { cancellationHoursNotice: true } },
    },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const client = await prisma.client.findFirst({
    where: {
      businessId: business.id,
      deletedAt: null,
      ...(rut ? { rut } : { email }),
    },
    select: { id: true, name: true, email: true, phone: true },
  })
  if (!client) return NextResponse.json({ bookings: [], cancellationHoursNotice: business.clubSettings?.cancellationHoursNotice ?? 24 })

  const bookings = await prisma.courtBooking.findMany({
    where: {
      businessId: business.id,
      clientId: client.id,
      startTime: { gte: new Date() },
      status: { notIn: ["CANCELLED"] },
      deletedAt: null,
    },
    select: {
      id: true, startTime: true, endTime: true, price: true, paidOnline: true, paidAmount: true, status: true, notes: true,
      court: { select: { name: true, sport: true, color: true } },
    },
    orderBy: { startTime: "asc" },
    take: 20,
  })

  return NextResponse.json({
    client: { name: client.name, email: client.email },
    bookings,
    cancellationHoursNotice: business.clubSettings?.cancellationHoursNotice ?? 24,
  })
}
