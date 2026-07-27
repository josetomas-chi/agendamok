import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; groupId: string }> }

// GET: list payments for a group, optionally filtered by period
export async function GET(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, groupId } = await params
  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period")

  const payments = await prisma.schoolPayment.findMany({
    where: { businessId: id, groupId, ...(period ? { period } : {}) },
  })
  return NextResponse.json({ payments })
}

// POST: upsert payment status for an enrollment+period
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, groupId } = await params
  const { enrollmentId, period, amount, status, notes } = await req.json()
  if (!enrollmentId || !period) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const payment = await prisma.schoolPayment.upsert({
    where: { enrollmentId_period: { enrollmentId, period } },
    update: {
      status: status ?? "PAID",
      amount: amount ?? 0,
      notes: notes ?? null,
      paidAt: status === "PAID" ? new Date() : null,
    },
    create: {
      businessId: id,
      groupId,
      enrollmentId,
      period,
      amount: amount ?? 0,
      status: status ?? "PAID",
      notes: notes ?? null,
      paidAt: status === "PAID" ? new Date() : null,
    },
  })
  return NextResponse.json({ payment })
}
