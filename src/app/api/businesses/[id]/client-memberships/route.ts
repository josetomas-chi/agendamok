import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addDays } from "date-fns"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const memberships = await prisma.clientMembership.findMany({
    where: { businessId: id },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      plan: { select: { id: true, name: true, price: true, durationDays: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ memberships })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { clientId, planId, startDate } = await req.json()
  if (!clientId || !planId) return NextResponse.json({ error: "Cliente y plan requeridos" }, { status: 400 })

  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })

  const start = startDate ? new Date(startDate) : new Date()
  const end = addDays(start, plan.durationDays - 1)

  const membership = await prisma.clientMembership.create({
    data: { businessId: id, clientId, planId, startDate: start, endDate: end, status: "ACTIVE" },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      plan: { select: { id: true, name: true, price: true, durationDays: true } },
    },
  })
  return NextResponse.json({ membership }, { status: 201 })
}
