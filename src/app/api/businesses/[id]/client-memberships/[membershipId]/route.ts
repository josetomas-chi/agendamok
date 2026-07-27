import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addDays } from "date-fns"

type Params = { params: Promise<{ id: string; membershipId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, membershipId } = await params
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if ("status" in body) data.status = body.status

  // Renovar: recalcula endDate desde hoy + durationDays del plan
  if (body.renew) {
    const membership = await prisma.clientMembership.findUnique({
      where: { id: membershipId },
      include: { plan: true },
    })
    if (membership) {
      const start = new Date()
      data.startDate = start
      data.endDate = addDays(start, membership.plan.durationDays - 1)
      data.status = "ACTIVE"
    }
  }

  const membership = await prisma.clientMembership.update({
    where: { id: membershipId, businessId: id },
    data,
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      plan: { select: { id: true, name: true, price: true, durationDays: true } },
    },
  })
  return NextResponse.json({ membership })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, membershipId } = await params
  await prisma.clientMembership.delete({ where: { id: membershipId, businessId: id } })
  return NextResponse.json({ ok: true })
}
