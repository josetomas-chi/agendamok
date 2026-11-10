import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ clientId: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { clientId } = await params
  const { amountPaid, description } = await req.json()

  if (!amountPaid || Number(amountPaid) <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 })
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId, deletedAt: null },
    select: { id: true, businessId: true, loyaltyPoints: true, segment: true,
      business: { select: { loyaltyEnabled: true, loyaltyPesosPerPoint: true, loyaltyVipThreshold: true } },
    },
  })
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  if (!client.business.loyaltyEnabled) return NextResponse.json({ error: "Fidelización no habilitada" }, { status: 400 })

  const pesosPerPoint = client.business.loyaltyPesosPerPoint ?? 100
  const pointsEarned = Math.floor(Number(amountPaid) / pesosPerPoint)
  if (pointsEarned <= 0) return NextResponse.json({ error: "Monto insuficiente para ganar puntos" }, { status: 400 })

  const [updated] = await prisma.$transaction([
    prisma.client.update({
      where: { id: clientId },
      data: { loyaltyPoints: { increment: pointsEarned } },
      select: { loyaltyPoints: true, segment: true },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        businessId: client.businessId,
        clientId,
        type: "EARN",
        points: pointsEarned,
        amountPaid: Number(amountPaid),
        description: description || `Cobro $${Number(amountPaid).toLocaleString("es-CL")}`,
        staffName: session.user.name || null,
      },
    }),
  ])

  // Auto-upgrade to VIP if threshold reached
  const vipThreshold = client.business.loyaltyVipThreshold ?? 500
  if (updated.loyaltyPoints >= vipThreshold && updated.segment !== "VIP") {
    await prisma.client.update({ where: { id: clientId }, data: { segment: "VIP" } })
  }

  return NextResponse.json({ pointsEarned, totalPoints: updated.loyaltyPoints })
}
