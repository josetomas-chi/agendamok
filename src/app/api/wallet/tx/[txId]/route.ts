import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: Promise<{ txId: string }> }) {
  const { txId } = await params
  const tx = await prisma.walletTransaction.findUnique({
    where: { id: txId },
    select: { status: true, amount: true },
  })
  if (!tx) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  return NextResponse.json(tx)
}
