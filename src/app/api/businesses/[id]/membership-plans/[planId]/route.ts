import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; planId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, planId } = await params
  const body = await req.json()
  const plan = await prisma.membershipPlan.update({ where: { id: planId, businessId: id }, data: body })
  return NextResponse.json({ plan })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, planId } = await params
  await prisma.membershipPlan.update({ where: { id: planId, businessId: id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
