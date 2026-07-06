import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const VIP_THRESHOLD = 500

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, clientId } = await params
  const body = await req.json()

  const allowed: Record<string, unknown> = {}
  if (body.segment !== undefined) allowed.segment = body.segment
  if (body.loyaltyPoints !== undefined) allowed.loyaltyPoints = Math.max(0, Number(body.loyaltyPoints))
  if (body.notes !== undefined) allowed.notes = body.notes
  if (body.tags !== undefined) allowed.tags = body.tags

  // Auto-promote to VIP if points cross threshold
  if (allowed.loyaltyPoints !== undefined && (allowed.loyaltyPoints as number) >= VIP_THRESHOLD && body.segment === undefined) {
    allowed.segment = "VIP"
  }

  const client = await prisma.client.update({
    where: { id: clientId, businessId: id, deletedAt: null },
    data: allowed,
  })

  return NextResponse.json({ client })
}
