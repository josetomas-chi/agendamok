import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ clientId: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { clientId } = await params
  const { benefitId } = await req.json()
  if (!benefitId) return NextResponse.json({ error: "Falta benefitId" }, { status: 400 })

  const [client, benefit] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId, deletedAt: null },
      select: { id: true, businessId: true, loyaltyPoints: true,
        business: { select: { loyaltyEnabled: true } },
      },
    }),
    prisma.loyaltyBenefit.findUnique({ where: { id: benefitId } }),
  ])

  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  if (!client.business.loyaltyEnabled) return NextResponse.json({ error: "Fidelización no habilitada" }, { status: 400 })
  if (!benefit || !benefit.isActive || benefit.businessId !== client.businessId) {
    return NextResponse.json({ error: "Beneficio no válido" }, { status: 404 })
  }
  if (client.loyaltyPoints < benefit.pointsCost) {
    return NextResponse.json({ error: "Puntos insuficientes" }, { status: 400 })
  }

  const [updated] = await prisma.$transaction([
    prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: { decrement: benefit.pointsCost } },
      select: { loyaltyPoints: true },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        businessId: client.businessId,
        clientId,
        type: "REDEEM",
        points: -benefit.pointsCost,
        description: `Canje: ${benefit.name}`,
        benefitId,
        staffName: session.user.name || null,
      },
    }),
  ])

  return NextResponse.json({ pointsSpent: benefit.pointsCost, totalPoints: updated.loyaltyPoints, benefitName: benefit.name })
}
