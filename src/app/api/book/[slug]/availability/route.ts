import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMinutes, format, startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const serviceId = searchParams.get("serviceId")
  const staffId = searchParams.get("staffId")
  const date = searchParams.get("date")

  if (!serviceId || !date) {
    return NextResponse.json({ error: "Faltan parámetros: serviceId, date" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id },
    select: { duration: true },
  })
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

  const day = parseISO(date)
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)

  const existing = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
      ...(staffId ? { staffId } : {}),
      startTime: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      deletedAt: null,
    },
    select: { startTime: true, endTime: true },
  })

  const slots: string[] = []
  const duration = Number(service.duration)
  let cursor = new Date(dayStart)
  cursor.setHours(8, 0, 0, 0)
  const cutoff = new Date(dayStart)
  cutoff.setHours(20, 0, 0, 0)
  const now = new Date()

  while (cursor < cutoff) {
    if (cursor > now) {
      const slotEnd = addMinutes(cursor, duration)
      const overlaps = existing.some((a: { startTime: Date; endTime: Date }) => {
        const aStart = new Date(a.startTime)
        const aEnd = new Date(a.endTime)
        return cursor < aEnd && slotEnd > aStart
      })
      if (!overlaps) slots.push(format(cursor, "HH:mm"))
    }
    cursor = addMinutes(cursor, 30)
  }

  return NextResponse.json({ slots })
}
