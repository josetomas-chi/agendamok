import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addDays } from "date-fns"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")
  const memberships = await prisma.clientMembership.findMany({
    where: { businessId: id, ...(clientId && { clientId }) },
    include: {
      client: { select: { id: true, name: true, email: true } },
      plan: { select: { id: true, name: true, price: true, durationDays: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ memberships })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { clientId, planId, startDate } = await req.json()

  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } })
  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })

  const start = new Date(startDate)
  const end = addDays(start, plan.durationDays - 1)

  const membership = await prisma.clientMembership.create({
    data: { businessId: id, clientId, planId, startDate: start, endDate: end, status: "ACTIVE" },
    include: {
      client: { select: { id: true, name: true, email: true } },
      plan: { select: { id: true, name: true, price: true, durationDays: true } },
    },
  })
  return NextResponse.json({ membership }, { status: 201 })
}
