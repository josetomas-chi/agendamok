import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessCreatePayment } from "@/lib/flow"

type Params = { params: Promise<{ tournamentId: string }> }

export async function POST(req: Request, { params }: Params) {
  const { tournamentId } = await params

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      business: {
        select: { id: true, name: true, slug: true, onlinePaymentsEnabled: true, flowApiKey: true, flowSecretKey: true },
      },
    },
  })

  if (!tournament) return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 })
  if (tournament.status !== "OPEN") return NextResponse.json({ error: "Las inscripciones están cerradas" }, { status: 400 })

  const body = await req.json()
  const { name, email, players, categoryId } = body

  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: "Email requerido" }, { status: 400 })

  // Check capacity (only count confirmed registrations)
  if (tournament.maxParticipants) {
    const count = await prisma.tournamentParticipant.count({
      where: { tournamentId, status: "REGISTERED" },
    })
    if (count >= tournament.maxParticipants) {
      return NextResponse.json({ error: "El torneo está lleno" }, { status: 400 })
    }
  }

  const hasEntryFee = tournament.entryFee && Number(tournament.entryFee) > 0
  const paymentEnabled = !!(tournament.business.onlinePaymentsEnabled && tournament.business.flowApiKey && tournament.business.flowSecretKey)

  // Create participant — PENDING_PAYMENT if fee required, REGISTERED if free
  const initialStatus = hasEntryFee && paymentEnabled ? "PENDING_PAYMENT" : "REGISTERED"

  const participant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      players: players || [],
      categoryId: categoryId || null,
      status: initialStatus,
    },
  })

  // If free or no payment method, done
  if (initialStatus === "REGISTERED") {
    return NextResponse.json({ participant, requiresPayment: false })
  }

  // Create Flow payment
  const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"
  const commerceOrder = `tournament_${participant.id}_${Date.now()}`

  try {
    const result = await businessCreatePayment(
      tournament.business.flowApiKey!,
      tournament.business.flowSecretKey!,
      {
        commerceOrder,
        subject: `Inscripción: ${tournament.name} — ${tournament.business.name}`,
        amount: Math.round(Number(tournament.entryFee)),
        email: email.trim(),
        urlReturn: `${baseUrl}/torneos/${tournamentId}/inscripcion-result?orderId=${commerceOrder}`,
        urlConfirmation: `${baseUrl}/api/public/tournaments/${tournamentId}/payment-webhook`,
      }
    )

    await prisma.tournamentParticipant.update({
      where: { id: participant.id },
      data: { paymentOrderId: commerceOrder },
    })

    return NextResponse.json({ participant, requiresPayment: true, paymentUrl: result.url, token: result.token })
  } catch (err) {
    // Roll back participant creation if payment fails to initialize
    await prisma.tournamentParticipant.delete({ where: { id: participant.id } })
    const message = err instanceof Error ? err.message : "Error al iniciar pago"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
