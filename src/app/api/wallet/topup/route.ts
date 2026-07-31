import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessCreatePayment } from "@/lib/flow"

// POST /api/wallet/topup
// Body: { businessSlug, clientEmail, amount, method: "FLOW" | "TRANSFER" }
export async function POST(req: Request) {
  const { businessSlug, clientEmail, amount, method } = await req.json()

  if (!businessSlug || !clientEmail || !amount || amount < 1000) {
    return NextResponse.json({ error: "Parámetros inválidos (monto mínimo $1.000)" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true, name: true, flowApiKey: true, flowSecretKey: true, onlinePaymentsEnabled: true, bankName: true, bankAccountHolder: true, bankAccountNumber: true, bankAccountType: true, bankRut: true, bankEmail: true },
  })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  const client = await prisma.client.findFirst({
    where: { businessId: business.id, email: { equals: clientEmail, mode: "insensitive" }, deletedAt: null },
    select: { id: true, name: true, email: true },
  })
  if (!client) return NextResponse.json({ error: "Cliente no encontrado en este negocio" }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.cl"

  if (method === "FLOW") {
    if (!business.flowApiKey || !business.flowSecretKey) {
      return NextResponse.json({ error: "El negocio no tiene Flow configurado" }, { status: 400 })
    }
    const tx = await prisma.walletTransaction.create({
      data: { businessId: business.id, clientId: client.id, type: "TOPUP", amount, method: "FLOW", status: "PENDING" },
    })
    const result = await businessCreatePayment(business.flowApiKey, business.flowSecretKey, {
      commerceOrder: `wallet-${tx.id}`,
      subject: `Recarga billetera — ${business.name}`,
      amount,
      email: client.email!,
      urlReturn: `${appUrl}/wallet/${businessSlug}/result?txId=${tx.id}`,
      urlConfirmation: `${appUrl}/api/wallet/topup/flow-confirm`,
    })
    if (!result.url || !result.token) {
      return NextResponse.json({ error: "Error al crear pago en Flow" }, { status: 500 })
    }
    await prisma.walletTransaction.update({ where: { id: tx.id }, data: { reference: result.token } })
    return NextResponse.json({ redirect: `${result.url}?token=${result.token}` })
  }

  if (method === "TRANSFER") {
    const tx = await prisma.walletTransaction.create({
      data: { businessId: business.id, clientId: client.id, type: "TOPUP", amount, method: "TRANSFER", status: "PENDING", note: "Pendiente confirmación del negocio" },
    })
    return NextResponse.json({
      txId: tx.id,
      bank: {
        bankName: business.bankName,
        bankAccountHolder: business.bankAccountHolder,
        bankAccountNumber: business.bankAccountNumber,
        bankAccountType: business.bankAccountType,
        bankRut: business.bankRut,
        bankEmail: business.bankEmail,
      },
    })
  }

  return NextResponse.json({ error: "Método no soportado" }, { status: 400 })
}
