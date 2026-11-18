import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ clientId: string }> }

const CLIENT_SELECT = {
  id: true, name: true, lastName: true, loyaltyPoints: true, segment: true, rut: true,
  business: {
    select: {
      id: true, name: true, logo: true, primaryColor: true,
      loyaltyEnabled: true, loyaltyVipThreshold: true, loyaltyPesosPerPoint: true,
      loyaltyBenefits: {
        where: { isActive: true },
        select: { id: true, name: true, description: true, pointsCost: true, category: true },
        orderBy: { pointsCost: "asc" },
      },
    },
  },
}

// Public endpoint — client shows their card; we only expose safe fields
// clientId param accepts either the internal id OR the client's RUT
export async function GET(_: Request, { params }: Params) {
  const { clientId } = await params

  let client = await prisma.client.findUnique({
    where: { id: clientId, deletedAt: null },
    select: CLIENT_SELECT,
  })

  if (!client) {
    client = await prisma.client.findFirst({
      where: { rut: clientId, deletedAt: null },
      select: CLIENT_SELECT,
    }) ?? null
  }

  if (!client || !client.business.loyaltyEnabled) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  }
  return NextResponse.json({ client })
}
