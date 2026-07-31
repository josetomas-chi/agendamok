import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessGetPaymentStatus } from "@/lib/flow"

export async function POST(req: Request) {
  const body = await req.formData().catch(() => null)
  const token = body?.get("token") as string | null
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 })

  const tx = await prisma.walletTransaction.findFirst({
    where: { reference: token, method: "FLOW", status: "PENDING" },
    include: { business: { select: { flowApiKey: true, flowSecretKey: true } } },
  })
  if (!tx) return NextResponse.json({ ok: true }) // ya procesado

  const status = await businessGetPaymentStatus(tx.business.flowApiKey!, tx.business.flowSecretKey!, token)

  if (status.status === 2) {
    // Pago exitoso — acreditar saldo
    await prisma.$transaction([
      prisma.walletTransaction.update({
        where: { id: tx.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      }),
      prisma.client.update({
        where: { id: tx.clientId },
        data: { creditBalance: { increment: tx.amount * 100 } },
      }),
    ])
  } else {
    await prisma.walletTransaction.update({ where: { id: tx.id }, data: { status: "REJECTED" } })
  }

  return NextResponse.json({ ok: true })
}
