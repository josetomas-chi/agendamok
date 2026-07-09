import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyBusinessWebhook, businessGetPaymentStatus } from "@/lib/flow"

type Params = { params: Promise<{ tournamentId: string }> }

export async function POST(req: Request, { params }: Params) {
  const { tournamentId } = await params
  const body = await req.text()
  const formParams = Object.fromEntries(new URLSearchParams(body))

  const { token } = formParams
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { business: { select: { flowApiKey: true, flowSecretKey: true } } },
  })
  if (!tournament?.business.flowApiKey) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  // Verify signature
  if (!verifyBusinessWebhook(tournament.business.flowSecretKey!, formParams)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 })
  }

  // Get payment status from Flow
  const payment = await businessGetPaymentStatus(tournament.business.flowApiKey, tournament.business.flowSecretKey!, token)

  if (payment.status === 2) {
    // status 2 = pagado
    const commerceOrder = payment.commerceOrder as string
    await prisma.tournamentParticipant.updateMany({
      where: { paymentOrderId: commerceOrder, tournamentId },
      data: { status: "REGISTERED" },
    })
  }

  return NextResponse.json({ ok: true })
}
