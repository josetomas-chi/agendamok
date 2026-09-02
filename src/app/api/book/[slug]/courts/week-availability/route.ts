import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMinutes, parseISO, startOfDay, endOfDay } from "date-fns"
import { chileLocalToUTC } from "@/lib/timezone"

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const duration = Number(searchParams.get("duration") || "60")
  const sportParam = searchParams.get("sport") || ""
  const sports = sportParam ? sportParam.split(",").map(s => s.trim()).filter(Boolean) : []

  if (!from || !to) return NextResponse.json({ error: "Faltan from/to" }, { status: 400 })

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const courts = await prisma.court.findMany({
    where: {
      businessId: business.id,
      isActive: true,
      ...(sports.length > 0 ? { sport: { in: sports } } : {}),
    },
    select: {
      id: true,
      pricingRules: { select: { days: true, startTime: true, endTime: true, fixedSlots: true } },
    },
  })

  const fromDay = parseISO(from)
  const toDay = parseISO(to)

  // Build list of dates to check
  const dates: Date[] = []
  let cur = new Date(fromDay)
  while (cur <= toDay) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  const fromStart = startOfDay(fromDay)
  const toEnd = endOfDay(toDay)

  // Load all bookings for the whole range in one query
  const bookings = await prisma.courtBooking.findMany({
    where: {
      businessId: business.id,
      courtId: { in: courts.map(c => c.id) },
      startTime: { gte: fromStart, lte: toEnd },
      status: { notIn: ["CANCELLED"] },
      deletedAt: null,
    },
    select: { courtId: true, startTime: true, endTime: true },
  })

  const now = new Date()

  function timeToMins(t: string) {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
  }

  // Returns true if any court has at least one available slot on this date
  function hasAvailability(date: Date): boolean {
    const dow = date.getDay()
    const dayStart = startOfDay(date)
    const dayBookings = bookings.filter(b => {
      const bs = new Date(b.startTime)
      return bs >= startOfDay(date) && bs <= endOfDay(date)
    })

    for (const court of courts) {
      const rulesForDay = court.pricingRules.filter(r => r.days.includes(dow))
      if (rulesForDay.length === 0) continue

      const fixedRules = rulesForDay.filter(r => r.fixedSlots && r.fixedSlots.length > 0)
      const flexRules  = rulesForDay.filter(r => !r.fixedSlots || r.fixedSlots.length === 0)

      const courtBookings = dayBookings.filter(b => b.courtId === court.id)

      function isBooked(start: Date, end: Date) {
        const startUTC = chileLocalToUTC(start)
        const endUTC = chileLocalToUTC(end)
        return courtBookings.some(b => startUTC < new Date(b.endTime) && endUTC > new Date(b.startTime))
      }

      // Check fixed slots
      for (const rule of fixedRules) {
        const [h1, m1] = rule.fixedSlots[0].split(":").map(Number)
        const [h2, m2] = rule.fixedSlots[1]?.split(":").map(Number) ?? [h1 + 1, m1]
        const ruleDuration = (h2 * 60 + m2) - (h1 * 60 + m1)
        if (duration !== 0 && ruleDuration !== duration) continue
        for (const slotTime of rule.fixedSlots) {
          const [sh, sm] = slotTime.split(":").map(Number)
          const start = new Date(dayStart)
          start.setHours(sh, sm, 0, 0)
          if (start <= now) continue
          const end = addMinutes(start, ruleDuration)
          if (!isBooked(start, end)) return true
        }
      }

      // Check flex slots
      if (flexRules.length > 0) {
        const flexOpen  = Math.min(...flexRules.map(r => timeToMins(r.startTime)))
        const flexClose = Math.max(...flexRules.map(r => timeToMins(r.endTime)))
        let slotStart = new Date(dayStart)
        slotStart.setHours(Math.floor(flexOpen / 60), flexOpen % 60, 0, 0)
        const cutoff = new Date(dayStart)
        cutoff.setHours(Math.floor(flexClose / 60), flexClose % 60, 0, 0)

        while (slotStart < cutoff) {
          const slotEnd = addMinutes(slotStart, duration)
          if (slotEnd > cutoff) break
          if (slotStart > now && !isBooked(slotStart, slotEnd)) return true
          slotStart = addMinutes(slotStart, 30)
        }
      }
    }
    return false
  }

  const result: Record<string, boolean> = {}
  for (const date of dates) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    result[key] = hasAvailability(date)
  }

  return NextResponse.json(result)
}
