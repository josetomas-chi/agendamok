import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { subDays } from "date-fns"

// VIP maintenance: must accumulate 200+ points in the last 180 days to stay VIP
const VIP_MAINTENANCE_POINTS = 200
const VIP_MAINTENANCE_DAYS = 180

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const d30 = subDays(now, 30)
  const d60 = subDays(now, 60)
  const d180 = subDays(now, VIP_MAINTENANCE_DAYS)

  // Fetch all active clients (including VIP) with their last booking date and recent points
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      segment: true,
      createdAt: true,
      courtBookings: {
        where: { deletedAt: null, status: { in: ["CONFIRMED", "COMPLETED"] } },
        orderBy: { startTime: "desc" },
        take: 1,
        select: { startTime: true },
      },
      appointments: {
        where: { deletedAt: null, status: { in: ["CONFIRMED", "COMPLETED"] } },
        orderBy: { startTime: "desc" },
        take: 1,
        select: { startTime: true },
      },
      loyaltyTransactions: {
        where: { createdAt: { gte: d180 }, points: { gt: 0 } },
        select: { points: true },
      },
    },
  })

  const counts = { vipDowngraded: 0, frequent: 0, atRisk: 0, nuevo: 0 }

  for (const client of clients) {
    const lastBooking = client.courtBookings[0]?.startTime ?? null
    const lastAppt = client.appointments[0]?.startTime ?? null
    const lastActivity = lastBooking && lastAppt
      ? (lastBooking > lastAppt ? lastBooking : lastAppt)
      : lastBooking ?? lastAppt ?? null

    // VIP maintenance check: downgrade if hasn't accumulated enough points in last 6 months
    if (client.segment === "VIP") {
      const recentPoints = client.loyaltyTransactions.reduce((sum, t) => sum + t.points, 0)
      if (recentPoints < VIP_MAINTENANCE_POINTS) {
        await prisma.client.update({
          where: { id: client.id },
          data: { segment: "FREQUENT" },
        })
        counts.vipDowngraded++
      }
      continue
    }

    let newSegment: string

    if (!lastActivity) {
      newSegment = "NUEVO"
    } else if (lastActivity >= d30) {
      newSegment = "FREQUENT"
      counts.frequent++
    } else if (lastActivity >= d60) {
      newSegment = "AT_RISK"
      counts.atRisk++
    } else {
      newSegment = "NUEVO"
      counts.nuevo++
    }

    if (newSegment !== client.segment) {
      await prisma.client.update({
        where: { id: client.id },
        data: { segment: newSegment },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: clients.length,
    updated: counts,
  })
}
