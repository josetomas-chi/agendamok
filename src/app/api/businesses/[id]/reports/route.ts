import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const { searchParams } = new URL(req.url)
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")

  const now = new Date()
  const monthStart = fromParam ? new Date(fromParam) : startOfMonth(now)
  const monthEnd = toParam ? new Date(toParam) : endOfMonth(now)

  const paymentWhere = (extra: object) => ({
    status: "PAID" as const,
    OR: [
      { appointment: { businessId: id, deletedAt: null } },
      { courtBooking: { businessId: id, deletedAt: null } },
    ],
    ...extra,
  })

  // Revenue by month (last 6 months)
  const revenueByMonth = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      return prisma.payment.aggregate({
        where: paymentWhere({ paidAt: { gte: startOfMonth(d), lte: endOfMonth(d) } }),
        _sum: { amount: true },
      }).then((r: { _sum: { amount: unknown } }) => ({ month: format(d, "MMM"), revenue: Number(r._sum.amount || 0) }))
    })
  )

  // This month stats (appointments + court bookings)
  const courtWhere = (extra: object) => ({ businessId: id, deletedAt: null, startTime: { gte: monthStart, lte: monthEnd }, ...extra })

  const [
    totalAppts, completedAppts, cancelledAppts, noShowAppts,
    totalCourt, completedCourt, cancelledCourt,
    monthRevenue,
  ] = await Promise.all([
    prisma.appointment.count({ where: { businessId: id, deletedAt: null, startTime: { gte: monthStart, lte: monthEnd } } }),
    prisma.appointment.count({ where: { businessId: id, deletedAt: null, status: "COMPLETED", startTime: { gte: monthStart, lte: monthEnd } } }),
    prisma.appointment.count({ where: { businessId: id, deletedAt: null, status: "CANCELLED", startTime: { gte: monthStart, lte: monthEnd } } }),
    prisma.appointment.count({ where: { businessId: id, deletedAt: null, status: "NO_SHOW", startTime: { gte: monthStart, lte: monthEnd } } }),
    prisma.courtBooking.count({ where: courtWhere({}) }),
    prisma.courtBooking.count({ where: courtWhere({ status: "COMPLETED" }) }),
    prisma.courtBooking.count({ where: courtWhere({ status: "CANCELLED" }) }),
    prisma.payment.aggregate({
      where: paymentWhere({ paidAt: { gte: monthStart, lte: monthEnd } }),
      _sum: { amount: true },
    }),
  ])

  const total = totalAppts + totalCourt
  const completed = completedAppts + completedCourt
  const cancelled = cancelledAppts + cancelledCourt
  const noShow = noShowAppts

  // Top services (appointments + court bookings via coach name)
  const topApptServices = await prisma.appointment.groupBy({
    by: ["serviceId"],
    where: { businessId: id, deletedAt: null, status: "COMPLETED", startTime: { gte: monthStart, lte: monthEnd } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  })
  const courtBookingServiceRows = await prisma.courtBooking.findMany({
    where: { businessId: id, deletedAt: null, status: "COMPLETED", startTime: { gte: monthStart, lte: monthEnd } },
    select: { coachId: true },
  })

  const apptServiceRows = await Promise.all(
    topApptServices.map(async (s: { serviceId: string; _count: { id: number } }) => {
      const service = await prisma.service.findUnique({ where: { id: s.serviceId }, select: { name: true } })
      return { name: service?.name || "Desconocido", count: s._count.id }
    })
  )

  // Group court bookings by coachId in code
  const coachCountMap = new Map<string, number>()
  let noCoachCount = 0
  for (const r of courtBookingServiceRows) {
    if (r.coachId) coachCountMap.set(r.coachId, (coachCountMap.get(r.coachId) ?? 0) + 1)
    else noCoachCount++
  }
  const coachServiceRows = await Promise.all(
    [...coachCountMap.entries()].map(async ([coachId, count]) => {
      const coach = await prisma.clubCoach.findUnique({ where: { id: coachId }, select: { name: true } })
      return { name: `Clase ${coach?.name || "Coach"}`, count }
    })
  )
  const allServiceRows = [
    ...apptServiceRows,
    ...coachServiceRows,
    ...(noCoachCount > 0 ? [{ name: "Reserva de cancha", count: noCoachCount }] : []),
  ].sort((a, b) => b.count - a.count).slice(0, 5)

  // Revenue by sport (court bookings in period with price > 0)
  const courtBookingsWithSport = await prisma.courtBooking.findMany({
    where: { businessId: id, deletedAt: null, status: "COMPLETED", startTime: { gte: monthStart, lte: monthEnd } },
    select: { price: true, court: { select: { sport: true } } },
  })
  const sportRevenueMap = new Map<string, number>()
  for (const b of courtBookingsWithSport) {
    const sport = b.court?.sport || "Sin deporte"
    sportRevenueMap.set(sport, (sportRevenueMap.get(sport) ?? 0) + Number(b.price))
  }
  const revenueByS = [...sportRevenueMap.entries()]
    .map(([sport, revenue]) => ({ sport, revenue }))
    .sort((a, b) => b.revenue - a.revenue)

  // Top clients (appointments + court bookings)
  const [apptClientRows, courtClientRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId: id, deletedAt: null, status: "COMPLETED" },
      select: { clientId: true },
    }),
    prisma.courtBooking.findMany({
      where: { businessId: id, deletedAt: null, status: "COMPLETED" },
      select: { clientId: true },
    }),
  ])

  const clientMap = new Map<string, number>()
  for (const r of apptClientRows) if (r.clientId) clientMap.set(r.clientId, (clientMap.get(r.clientId) ?? 0) + 1)
  for (const r of courtClientRows) if (r.clientId) clientMap.set(r.clientId, (clientMap.get(r.clientId) ?? 0) + 1)
  const topClientIds = [...clientMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  const topClientsWithNames = await Promise.all(
    topClientIds.map(async ([clientId, visits]) => {
      const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } })
      return { name: client?.name || "Desconocido", visits }
    })
  )

  return NextResponse.json({
    revenueByMonth,
    monthStats: {
      total,
      completed,
      cancelled,
      noShow,
      revenue: Number(monthRevenue._sum.amount || 0),
      occupancyRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0,
    },
    topServices: allServiceRows,
    topClients: topClientsWithNames,
    revenueByS,
  })
}
