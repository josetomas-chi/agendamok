import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { utcToChileLocal } from "@/lib/timezone"

// Returns occupancy % per (dayOfWeek 0-6, hour 0-23) for each court
// over the last 30 days.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const courts = await prisma.court.findMany({
    where: { businessId: id, isActive: true },
    select: {
      id: true, name: true, color: true,
      pricingRules: { select: { days: true, startTime: true, endTime: true } },
    },
    orderBy: { sortOrder: "asc" },
  })

  const bookings = await prisma.courtBooking.findMany({
    where: {
      businessId: id,
      startTime: { gte: since },
      status: { not: "CANCELLED" },
      blockType: { not: "BLOCK" },
      deletedAt: null,
    },
    select: { courtId: true, startTime: true, endTime: true },
  })

  // For each court, build a map: dayOfWeek → hour → { booked minutes, available minutes }
  type Cell = { booked: number; available: number }
  type HeatmapRow = Record<number, Record<number, Cell>> // day → hour → cell

  const result: Record<string, HeatmapRow> = {}

  for (const court of courts) {
    const heatmap: HeatmapRow = {}
    for (let d = 0; d < 7; d++) {
      heatmap[d] = {}
      for (let h = 0; h < 24; h++) heatmap[d][h] = { booked: 0, available: 0 }
    }

    // Count available minutes for each day-of-week from pricing rules
    // We iterate each of the 30 days and sum real available minutes per hour
    for (let i = 0; i < 30; i++) {
      const day = new Date(since)
      day.setDate(day.getDate() + i)
      const dow = day.getDay()

      const dayRules = court.pricingRules.filter(r => r.days.includes(dow))
      for (const rule of dayRules) {
        const [sh, sm] = rule.startTime.split(":").map(Number)
        const [eh, em] = rule.endTime.split(":").map(Number)
        const startMin = sh * 60 + sm
        const endMin   = eh * 60 + em
        // Each hour slot that overlaps the rule
        for (let h = sh; h < Math.ceil(endMin / 60); h++) {
          const hStart = h * 60
          const hEnd   = h * 60 + 60
          const overlap = Math.min(hEnd, endMin) - Math.max(hStart, startMin)
          if (overlap > 0) heatmap[dow][h].available += overlap
        }
      }
    }

    // Count booked minutes from actual bookings (converted to Chile local time)
    for (const b of bookings) {
      if (b.courtId !== court.id) continue
      const localStart = utcToChileLocal(new Date(b.startTime))
      const localEnd   = utcToChileLocal(new Date(b.endTime))
      const dow = localStart.getDay()
      const startMin = localStart.getHours() * 60 + localStart.getMinutes()
      const endMin   = localEnd.getHours()   * 60 + localEnd.getMinutes()

      // Distribute booked minutes across the hours they span
      for (let h = localStart.getHours(); h <= localEnd.getHours() && h < 24; h++) {
        const hStart = h * 60
        const hEnd   = h * 60 + 60
        const overlap = Math.min(hEnd, endMin) - Math.max(hStart, startMin)
        if (overlap > 0) heatmap[dow][h].booked += overlap
      }
    }

    result[court.id] = heatmap
  }

  return NextResponse.json({
    courts: courts.map(c => ({ id: c.id, name: c.name, color: c.color })),
    heatmap: result,
  })
}
