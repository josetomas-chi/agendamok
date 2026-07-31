import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// GET — wallet transactions for a business
export async function GET(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")

  const transactions = await prisma.walletTransaction.findMany({
    where: { businessId: id, ...(clientId ? { clientId } : {}) },
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return NextResponse.json({ transactions })
}

// POST — manual adjustment (admin adds/deducts balance)
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { clientId, amount, type, note } = await req.json()

  if (!clientId || !amount || !type) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
  }

  const delta = (type === "DEBIT" ? -Math.abs(amount) : Math.abs(amount)) * 100

  const [tx] = await prisma.$transaction([
    prisma.walletTransaction.create({
      data: { businessId: id, clientId, type, amount: Math.abs(amount), method: "MANUAL", status: "CONFIRMED", confirmedAt: new Date(), note },
    }),
    prisma.client.update({
      where: { id: clientId },
      data: { creditBalance: { increment: delta } },
    }),
  ])

  return NextResponse.json({ transaction: tx })
}

// PATCH — confirm pending transfer
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { txId } = await req.json()

  const tx = await prisma.walletTransaction.findFirst({
    where: { id: txId, businessId: id, status: "PENDING" },
  })
  if (!tx) return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 })

  await prisma.$transaction([
    prisma.walletTransaction.update({
      where: { id: txId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    }),
    prisma.client.update({
      where: { id: tx.clientId },
      data: { creditBalance: { increment: tx.amount * 100 } },
    }),
  ])

  return NextResponse.json({ ok: true })
}
