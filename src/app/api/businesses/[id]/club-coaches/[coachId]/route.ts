import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; coachId: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, coachId } = await params

  const coach = await prisma.clubCoach.findFirst({
    where: { id: coachId, businessId: id },
    include: { feeRules: true },
  })
  if (!coach) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ coach })
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, coachId } = await params
  const body = await req.json()
  const { name, email, phone, photo, color, paymentType, commissionPercent, isActive, feeRules } = body

  const coach = await prisma.clubCoach.update({
    where: { id: coachId, businessId: id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(photo !== undefined && { photo: photo || null }),
      ...(color !== undefined && { color }),
      ...(paymentType !== undefined && { paymentType }),
      ...(commissionPercent !== undefined && { commissionPercent: paymentType === "COMMISSION" ? commissionPercent : null }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  // Reemplazar reglas de tarifa si se proporcionan
  if (feeRules !== undefined) {
    await prisma.clubCoachFeeRule.deleteMany({ where: { coachId } })
    if (feeRules.length > 0) {
      await prisma.clubCoachFeeRule.createMany({
        data: feeRules.map((r: { name: string; days: number[]; startTime: string; endTime: string; price: number }) => ({
          coachId,
          name: r.name,
          days: r.days,
          startTime: r.startTime,
          endTime: r.endTime,
          price: r.price,
        })),
      })
    }
  }

  const updated = await prisma.clubCoach.findUnique({
    where: { id: coachId },
    include: { feeRules: true },
  })
  return NextResponse.json({ coach: updated })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, coachId } = await params

  await prisma.clubCoach.delete({ where: { id: coachId, businessId: id } })
  return NextResponse.json({ success: true })
}
