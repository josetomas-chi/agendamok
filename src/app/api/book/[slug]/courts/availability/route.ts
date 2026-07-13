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
    let openHour = 8, closeHour = 22
    if (rulesForDay.length > 0) {
      openHour = Math.min(...rulesForDay.map(r => Number(r.startTime.split(":")[0])))
      closeHour = Math.max(...rulesForDay.map(r => Number(r.endTime.split(":")[0])))
    }

    const courtBookings = bookings.filter(b => b.courtId === court.id)
    const slots: { time: string; price: number }[] = []
    let cursor = new Date(dayStart)
    cursor.setHours(openHour, 0, 0, 0)
    const cutoff = new Date(dayStart)
    cutoff.setHours(closeHour, 0, 0, 0)

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
          const slotHour = cursor.getHours()
          const rule = rulesForDay.find(r => {
            const rStart = Number(r.startTime.split(":")[0])
            const rEnd = Number(r.endTime.split(":")[0])
            return slotHour >= rStart && slotHour < rEnd
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
