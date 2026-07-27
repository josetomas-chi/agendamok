import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const plans = await prisma.membershipPlan.findMany({
    where: { businessId: id },
    include: { _count: { select: { memberships: { where: { status: "ACTIVE" } } } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ plans })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { name, description, price, durationDays } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const plan = await prisma.membershipPlan.create({
    data: { businessId: id, name, description: description || null, price: price ?? 0, durationDays: durationDays ?? 30 },
    include: { _count: { select: { memberships: { where: { status: "ACTIVE" } } } } },
  })
  return NextResponse.json({ plan }, { status: 201 })
}
