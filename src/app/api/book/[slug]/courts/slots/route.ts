import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMinutes, format, parseISO, startOfDay, endOfDay } from "date-fns"

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const courtId = searchParams.get("courtId")
  const date = searchParams.get("date")
  const duration = Number(searchParams.get("duration") || "60")

  if (!courtId || !date) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const court = await prisma.court.findFirst({
    where: { id: courtId, businessId: business.id, isActive: true },
    select: { id: true, pricingRules: { select: { days: true, startTime: true, endTime: true, price: true } } },
  })
  if (!court) return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 })

  const day = parseISO(date)
  const dayOfWeek = day.getDay() // 0=Sun ... 6=Sat
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)

  // Determine operating hours from pricing rules for this day, default 8–22
  const rulesForDay = court.pricingRules.filter(r => r.days.includes(dayOfWeek))
  let openHour = 8, closeHour = 22
  if (rulesForDay.length > 0) {
    const starts = rulesForDay.map(r => Number(r.startTime.split(":")[0]))
    const ends = rulesForDay.map(r => Number(r.endTime.split(":")[0]))
    openHour = Math.min(...starts)
    closeHour = Math.max(...ends)
  }

  // Existing bookings
  const existing = await prisma.courtBooking.findMany({
    where: {
      courtId,
      startTime: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["CANCELLED"] },
      deletedAt: null,
    },
    select: { startTime: true, endTime: true },
  })

  const now = new Date()
  const slots: { time: string; price: number }[] = []
  let cursor = new Date(dayStart)
  cursor.setHours(openHour, 0, 0, 0)
  const cutoff = new Date(dayStart)
  cutoff.setHours(closeHour, 0, 0, 0)

  while (cursor < cutoff) {
    const slotEnd = addMinutes(cursor, duration)
    if (slotEnd > cutoff) break
    if (cursor > now) {
      const overlaps = existing.some(b => {
        const bStart = new Date(b.startTime)
        const bEnd = new Date(b.endTime)
        return cursor < bEnd && slotEnd > bStart
      })
      if (!overlaps) {
        // Calcular precio proporcional, soportando cruces de tarifa (ej. 17:00–18:30)
        let totalPrice = 0
        let priceCursor = new Date(cursor)
        const slotEndMs = slotEnd.getTime()
        while (priceCursor.getTime() < slotEndMs) {
          const h = priceCursor.getHours()
          const m = priceCursor.getMinutes()
          const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
          const rule = rulesForDay.find(r => timeStr >= r.startTime && timeStr < r.endTime)
          if (!rule) { priceCursor = addMinutes(priceCursor, 1); continue }
          const [reh, rem] = rule.endTime.split(":").map(Number)
          const ruleEnd = new Date(priceCursor)
          ruleEnd.setHours(reh, rem, 0, 0)
          const segEnd = ruleEnd.getTime() < slotEndMs ? ruleEnd : slotEnd
          const segHours = (segEnd.getTime() - priceCursor.getTime()) / (1000 * 60 * 60)
          totalPrice += Number(rule.price) * segHours
          priceCursor = segEnd
        }
        slots.push({ time: format(cursor, "HH:mm"), price: Math.round(totalPrice) })
      }
    }
    cursor = addMinutes(cursor, 30)
  }

  return NextResponse.json({ slots })
}
