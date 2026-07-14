import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessCreatePayment } from "@/lib/flow"
import { sendTournamentRegistrationConfirmation } from "@/lib/email"

type Params = { params: Promise<{ tournamentId: string }> }

export async function POST(req: Request, { params }: Params) {
  const { tournamentId } = await params

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      business: {
        select: { id: true, name: true, slug: true, onlinePaymentsEnabled: true, flowApiKey: true, flowSecretKey: true },
      },
      categories: true,
    },
  })

  if (!tournament) return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 })
  if (tournament.status !== "OPEN") return NextResponse.json({ error: "Las inscripciones están cerradas" }, { status: 400 })
  if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
    return NextResponse.json({ error: "El plazo de inscripción ha vencido" }, { status: 400 })
  }

  const body = await req.json()
  const { name, email, phone, rut, players, categoryId, restrictions } = body
  // restrictions: Array<{ date: string; time: string }>

  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: "Email requerido" }, { status: 400 })
  if (!rut?.trim()) return NextResponse.json({ error: "RUT requerido" }, { status: 400 })

  // Check RUT not already registered in this tournament
  const normalizedRut = rut.trim().replace(/\./g, "").toUpperCase()
  const existingRut = await prisma.tournamentParticipant.findFirst({
    where: { tournamentId, rut: normalizedRut },
  })
  if (existingRut) return NextResponse.json({ error: "Este RUT ya está inscrito en el torneo" }, { status: 400 })

  // Check global capacity
  if (tournament.maxParticipants) {
    const count = await prisma.tournamentParticipant.count({
      where: { tournamentId, status: "REGISTERED" },
    })
    if (count >= tournament.maxParticipants) {
      return NextResponse.json({ error: "El torneo está lleno" }, { status: 400 })
    }
  }

  // Check per-category capacity (groupCount × groupSize)
  if (categoryId) {
    const cat = tournament.categories.find(c => c.id === categoryId)
    if (cat && cat.groupCount && cat.groupSize) {
      const catMax = cat.groupCount * cat.groupSize
      const catCount = await prisma.tournamentParticipant.count({
        where: { tournamentId, categoryId, status: "REGISTERED" },
      })
      if (catCount >= catMax) {
        return NextResponse.json({ error: `La categoría ${cat.name} está llena` }, { status: 400 })
      }
    }
  }

  const hasEntryFee = tournament.entryFee && Number(tournament.entryFee) > 0
  const paymentEnabled = !!(tournament.business.onlinePaymentsEnabled && tournament.business.flowApiKey && tournament.business.flowSecretKey)

  // Create participant — PENDING_PAYMENT if fee required, REGISTERED if free
  const initialStatus = hasEntryFee && paymentEnabled ? "PENDING_PAYMENT" : "REGISTERED"

  // Validate restriction count if limit is set
  const maxR = tournament.maxRestrictionsPerParticipant ?? 0
  const sanitizedRestrictions: { date: string; time: string }[] =
    tournament.allowScheduleRestrictions && Array.isArray(restrictions)
      ? (maxR > 0 ? restrictions.slice(0, maxR) : restrictions).filter(
          (r: { date?: unknown; time?: unknown }) => typeof r.date === "string" && typeof r.time === "string"
        )
      : []

  const participant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId,
      name: name.trim(),
      rut: normalizedRut,
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      players: players || [],
      categoryId: categoryId || null,
      status: initialStatus,
      restrictions: sanitizedRestrictions.length > 0
        ? { create: sanitizedRestrictions.map(r => ({ date: r.date, time: r.time })) }
        : undefined,
    },
  })

  // If free or no payment method, send confirmation and done
  if (initialStatus === "REGISTERED") {
    const allPlayers: { name: string; email: string }[] = [{ name: name.trim(), email: email.trim() }]
    if (Array.isArray(players)) {
      for (const p of players) {
        if (p?.name && p?.email) allPlayers.push({ name: p.name, email: p.email })
      }
    }
    const cat = tournament.categories.find(c => c.id === categoryId)
    sendTournamentRegistrationConfirmation({
      players: allPlayers,
      tournamentName: tournament.name,
      businessName: tournament.business.name,
      startDate: tournament.startDate ? new Date(tournament.startDate).toLocaleDateString("es-CL") : "",
      category: cat?.name ?? null,
      entryFee: tournament.entryFee ? Number(tournament.entryFee) : null,
    }).catch(() => {})
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
