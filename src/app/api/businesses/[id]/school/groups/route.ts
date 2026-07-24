import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const groups = await prisma.schoolGroup.findMany({
    where: { businessId: id },
    include: {
      coach: { select: { id: true, name: true, color: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { client: { select: { id: true, name: true, email: true, phone: true, rut: true } } },
      },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ groups })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { name, sport, level, days, startTime, endTime, coachId, maxCapacity, monthlyPrice, billingCycle, color, startDate, endDate, notes } = body

  const group = await prisma.schoolGroup.create({
    data: {
      businessId: id, name, sport: sport || null, level: level || null,
      days: days ?? [], startTime, endTime,
      coachId: coachId || null,
      maxCapacity: maxCapacity ?? 10,
      monthlyPrice: monthlyPrice ?? 0,
      billingCycle: billingCycle ?? "MONTHLY",
      color: color ?? "#38bdf8",
      startDate: startDate ? new Date(startDate + "T00:00:00Z") : null,
      endDate: endDate ? new Date(endDate + "T00:00:00Z") : null,
      notes: notes || null,
    },
    include: { coach: { select: { id: true, name: true, color: true } } },
  })
  return NextResponse.json({ group }, { status: 201 })
}
