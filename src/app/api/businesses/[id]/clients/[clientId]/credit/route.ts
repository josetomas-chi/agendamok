import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; clientId: string }> }

// POST — add credit
// DELETE — deduct credit (when applied to a booking)
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: businessId, clientId } = await params
  const { amount } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 })

  const client = await prisma.client.findFirst({ where: { id: clientId, businessId } })
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: { creditBalance: { increment: amount } },
    select: { creditBalance: true },
  })

  return NextResponse.json({ ok: true, creditBalance: updated.creditBalance })
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: businessId, clientId } = await params
  const { amount } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 })

  const client = await prisma.client.findFirst({ where: { id: clientId, businessId } })
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  if (client.creditBalance < amount) return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 })

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: { creditBalance: { decrement: amount } },
    select: { creditBalance: true },
  })

  return NextResponse.json({ ok: true, creditBalance: updated.creditBalance })
}
