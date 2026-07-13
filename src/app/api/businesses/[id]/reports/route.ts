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

  // This month stats
  const [totalAppts, completedAppts, cancelledAppts, noShowAppts, monthRevenue] = await Promise.all([
    prisma.appointment.count({ where: { businessId: id, deletedAt: null, startTime: { gte: monthStart, lte: monthEnd } } }),
    prisma.appointment.count({ where: { businessId: id, deletedAt: null, status: "COMPLETED", startTime: { gte: monthStart, lte: monthEnd } } }),
    prisma.appointment.count({ where: { businessId: id, deletedAt: null, status: "CANCELLED", startTime: { gte: monthStart, lte: monthEnd } } }),
    prisma.appointment.count({ where: { businessId: id, deletedAt: null, status: "NO_SHOW", startTime: { gte: monthStart, lte: monthEnd } } }),
    prisma.payment.aggregate({
      where: paymentWhere({ paidAt: { gte: monthStart, lte: monthEnd } }),
      _sum: { amount: true },
    }),
  ])

  // Top services
  const topServices = await prisma.appointment.groupBy({
    by: ["serviceId"],
    where: { businessId: id, deletedAt: null, status: "COMPLETED", startTime: { gte: monthStart } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  })

  const topServicesWithNames = await Promise.all(
    topServices.map(async (s: { serviceId: string; _count: { id: number } }) => {
      const service = await prisma.service.findUnique({ where: { id: s.serviceId }, select: { name: true } })
      return { name: service?.name || "Desconocido", count: s._count.id }
    })
  )

  // Top clients
  const topClients = await prisma.appointment.groupBy({
    by: ["clientId"],
    where: { businessId: id, deletedAt: null, status: "COMPLETED" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  })

  const topClientsWithNames = await Promise.all(
    topClients.map(async (c: { clientId: string; _count: { id: number } }) => {
      const client = await prisma.client.findUnique({ where: { id: c.clientId }, select: { name: true } })
      return { name: client?.name || "Desconocido", visits: c._count.id }
    })
  )

  return NextResponse.json({
    revenueByMonth,
    monthStats: {
      total: totalAppts,
      completed: completedAppts,
      cancelled: cancelledAppts,
      noShow: noShowAppts,
      revenue: Number(monthRevenue._sum.amount || 0),
      occupancyRate: totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 0,
      noShowRate: totalAppts > 0 ? Math.round((noShowAppts / totalAppts) * 100) : 0,
    },
    topServices: topServicesWithNames,
    topClients: topClientsWithNames,
  })
}
