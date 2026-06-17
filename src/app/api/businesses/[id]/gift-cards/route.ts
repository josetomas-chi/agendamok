import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { amount, expiresAt } = await req.json()

  const code = `GC-${nanoid(8).toUpperCase()}`
  const giftCard = await prisma.giftCard.create({
    data: { businessId: id, code, amount, balance: amount, expiresAt: expiresAt ? new Date(expiresAt) : null },
  })
  return NextResponse.json({ giftCard }, { status: 201 })
}
