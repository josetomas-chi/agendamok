import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const plan = await prisma.membershipPlan.create({ data: { ...body, businessId: id } })
  return NextResponse.json({ plan }, { status: 201 })
}
