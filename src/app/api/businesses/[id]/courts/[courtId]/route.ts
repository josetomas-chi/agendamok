import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; courtId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, courtId } = await params
  const body = await req.json()
  const { pricingRules, ...courtData } = body

  const court = await prisma.$transaction(async (tx) => {
    if (pricingRules) {
      await tx.courtPricingRule.deleteMany({ where: { courtId } })
      await tx.courtPricingRule.createMany({
        data: pricingRules.map((r: { id?: string; name: string; days: number[]; startTime: string; endTime: string; price: number; fixedSlots?: string[]; paymentPlayers?: number }) => ({
          courtId,
          name: r.name,
          days: r.days.map(Number),
          startTime: r.startTime,
          endTime: r.endTime,
          price: Number(r.price),
          fixedSlots: (r.fixedSlots ?? []).filter(Boolean),
          paymentPlayers: Number(r.paymentPlayers ?? 1),
        }))
      })
    }
    return tx.court.update({
      where: { id: courtId, businessId: id },
      data: courtData,
      include: { pricingRules: true },
    })
  })
  return NextResponse.json({ court })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, courtId } = await params
  await prisma.court.update({ where: { id: courtId, businessId: id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
