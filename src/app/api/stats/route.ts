import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const revalidate = 3600 // cache 1 hour

export async function GET() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [businesses, appointmentsThisMonth, waConversations] = await Promise.all([
    prisma.business.count({ where: { isActive: true, deletedAt: null } }),
    prisma.appointment.count({
      where: { startTime: { gte: startOfMonth }, deletedAt: null, status: { in: ["CONFIRMED", "COMPLETED"] } },
    }),
    prisma.whatsAppMonthlyUsage.aggregate({
      where: { month },
      _sum: { count: true },
    }),
  ])

  return NextResponse.json({
    businesses,
    appointmentsThisMonth,
    waConversations: waConversations._sum.count ?? 0,
  })
}
