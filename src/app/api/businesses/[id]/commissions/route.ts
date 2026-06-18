import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const now = new Date()
  const monthStart = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = to ? new Date(to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const records = await prisma.commissionRecord.findMany({
    where: {
      businessId: id,
      createdAt: { gte: monthStart, lte: monthEnd },
    },
    include: {
      staff: { select: { id: true, color: true, user: { select: { name: true } } } },
      appointment: {
        select: {
          startTime: true,
          service: { select: { name: true } },
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group by staff
  type StaffSummary = {
    staffId: string
    name: string | null
    color: string
    total: number
    paid: number
    pending: number
    count: number
  }

  const byStaff = new Map<string, StaffSummary>()
  for (const r of records) {
    const key = r.staffId
    if (!byStaff.has(key)) {
      byStaff.set(key, {
        staffId: key,
        name: r.staff.user.name,
        color: r.staff.color,
        total: 0, paid: 0, pending: 0, count: 0,
      })
    }
    const s = byStaff.get(key)!
    s.total += Number(r.amount)
    s.count++
    if (r.isPaid) s.paid += Number(r.amount)
    else s.pending += Number(r.amount)
  }

  type R = typeof records[number]
  return NextResponse.json({
    records,
    byStaff: Array.from(byStaff.values()),
    totals: {
      total: records.reduce((s: number, r: R) => s + Number(r.amount), 0),
      paid: records.filter((r: R) => r.isPaid).reduce((s: number, r: R) => s + Number(r.amount), 0),
      pending: records.filter((r: R) => !r.isPaid).reduce((s: number, r: R) => s + Number(r.amount), 0),
    },
  })
}

// PATCH — mark commissions as paid for a staff member
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { staffId, from, to } = await req.json()

  await prisma.commissionRecord.updateMany({
    where: {
      businessId: id,
      staffId,
      isPaid: false,
      ...(from && to && { createdAt: { gte: new Date(from), lte: new Date(to) } }),
    },
    data: { isPaid: true, paidAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
