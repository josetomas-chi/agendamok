import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMinutes, format, parseISO, startOfDay, endOfDay } from "date-fns"

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  const duration = Number(searchParams.get("duration") || "60")
  const sport = searchParams.get("sport") || ""

  if (!date) return NextResponse.json({ error: "Falta date" }, { status: 400 })

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const courts = await prisma.court.findMany({
    where: {
      businessId: business.id,
      isActive: true,
      ...(sport ? { sport } : {}),
    },
    select: {
      id: true, name: true, sport: true, color: true,
      sponsorName: true, sponsorLogo: true, sponsorUrl: true,
      pricingRules: { select: { days: true, startTime: true, endTime: true, price: true } },
    },
    orderBy: { sortOrder: "asc" },
  })

  const day = parseISO(date)
  const dayOfWeek = day.getDay()
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  const now = new Date()

  // All bookings for this day across all courts
  const bookings = await prisma.courtBooking.findMany({
    where: {
      businessId: business.id,
      courtId: { in: courts.map(c => c.id) },
      startTime: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["CANCELLED"] },
      deletedAt: null,
    },
    select: { courtId: true, startTime: true, endTime: true },
  })

  const result = courts.map(court => {
    const rulesForDay = court.pricingRules.filter(r => r.days.includes(dayOfWeek))

    // Parse HH:MM properly (including minutes)
    function parseTime(t: string): { h: number; m: number } {
      const [h, m] = t.split(":").map(Number)
      return { h: h || 0, m: m || 0 }
    }
    function timeToMinutes(t: string) { const { h, m } = parseTime(t); return h * 60 + m }

    let openMinutes = 8 * 60, closeMinutes = 23 * 60
    if (rulesForDay.length > 0) {
      openMinutes = Math.min(...rulesForDay.map(r => timeToMinutes(r.startTime)))
      closeMinutes = Math.max(...rulesForDay.map(r => timeToMinutes(r.endTime)))
    }

    const courtBookings = bookings.filter(b => b.courtId === court.id)
    const slots: { time: string; price: number }[] = []
    let cursor = new Date(dayStart)
    cursor.setHours(Math.floor(openMinutes / 60), openMinutes % 60, 0, 0)
    const cutoff = new Date(dayStart)
    cutoff.setHours(Math.floor(closeMinutes / 60), closeMinutes % 60, 0, 0)

    while (cursor < cutoff) {
      const slotEnd = addMinutes(cursor, duration)
      if (slotEnd > cutoff) break
      if (cursor > now) {
        const overlaps = courtBookings.some(b => {
          const bStart = new Date(b.startTime)
          const bEnd = new Date(b.endTime)
          return cursor < bEnd && slotEnd > bStart
        })
        if (!overlaps) {
          const cursorMinutes = cursor.getHours() * 60 + cursor.getMinutes()
          const rule = rulesForDay.find(r => {
            return cursorMinutes >= timeToMinutes(r.startTime) && cursorMinutes < timeToMinutes(r.endTime)
          })
          slots.push({ time: format(cursor, "HH:mm"), price: rule ? Number(rule.price) : 0 })
        }
      }
      cursor = addMinutes(cursor, 30)
    }

    return {
      id: court.id, name: court.name, sport: court.sport, color: court.color,
      sponsorName: court.sponsorName, sponsorLogo: court.sponsorLogo, sponsorUrl: court.sponsorUrl,
      slots,
    }
  })

  return NextResponse.json({ courts: result })
}
