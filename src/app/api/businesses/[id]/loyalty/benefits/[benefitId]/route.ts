import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; benefitId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, benefitId } = await params
  const body = await req.json()
  const { name, description, pointsCost, category, isActive } = body
  const benefit = await prisma.loyaltyBenefit.update({
    where: { id: benefitId, businessId: id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(pointsCost !== undefined && { pointsCost: Number(pointsCost) }),
      ...(category !== undefined && { category }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  return NextResponse.json({ benefit })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, benefitId } = await params
  await prisma.loyaltyBenefit.delete({ where: { id: benefitId, businessId: id } })
  return NextResponse.json({ success: true })
}
