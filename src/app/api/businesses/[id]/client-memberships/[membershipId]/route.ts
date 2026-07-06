import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; membershipId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, membershipId } = await params
  const body = await req.json()
  const membership = await prisma.clientMembership.update({
    where: { id: membershipId, businessId: id },
    data: body,
    include: {
      client: { select: { id: true, name: true, email: true } },
      plan: { select: { id: true, name: true, price: true } },
    },
  })
  return NextResponse.json({ membership })
}
