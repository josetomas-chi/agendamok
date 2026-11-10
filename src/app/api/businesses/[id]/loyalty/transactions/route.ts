import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")
  const limit = Number(searchParams.get("limit") ?? "50")

  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { businessId: id, ...(clientId && { clientId }) },
    include: { client: { select: { id: true, name: true, lastName: true } }, benefit: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return NextResponse.json({ transactions })
}
