import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiKey } from "@/lib/apikey"
import { addMinutes, format, startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(req: Request) {
  const businessId = await authenticateApiKey(req)
  if (!businessId) return NextResponse.json({ error: "API key inválida" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const serviceId = searchParams.get("serviceId")
  const staffId = searchParams.get("staffId")
  const date = searchParams.get("date") // YYYY-MM-DD

  if (!serviceId || !date) {
    return NextResponse.json({ error: "Faltan parámetros: serviceId, date" }, { status: 400 })
  }

  const service = await prisma.service.findFirst({ where: { id: serviceId, businessId } })
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

  const day = parseISO(date)
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)

  // Get existing appointments
  const existing = await prisma.appointment.findMany({
    where: {
      businessId,
      ...(staffId ? { staffId } : {}),
      startTime: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      deletedAt: null,
    },
    select: { startTime: true, endTime: true },
  })

  // Generate 30-min slots 8am–8pm
  const slots: string[] = []
  const duration = Number(service.duration)
  let cursor = new Date(dayStart)
  cursor.setHours(8, 0, 0, 0)
  const cutoff = new Date(dayStart)
  cutoff.setHours(20, 0, 0, 0)

  while (cursor < cutoff) {
    const slotEnd = addMinutes(cursor, duration)
    const overlaps = existing.some((a: { startTime: Date; endTime: Date }) => {
      const aStart = new Date(a.startTime)
      const aEnd = new Date(a.endTime)
      return cursor < aEnd && slotEnd > aStart
    })
    if (!overlaps) slots.push(format(cursor, "HH:mm"))
    cursor = addMinutes(cursor, 30)
  }

  return NextResponse.json({ date, serviceId, staffId: staffId || null, slots })
}
