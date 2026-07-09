import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ tournamentId: string }> }

export async function GET(_: Request, { params }: Params) {
  const { tournamentId } = await params

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      business: { select: { name: true, slug: true, logoUrl: true, onlinePaymentsEnabled: true, flowApiKey: true, flowSecretKey: true } },
      categories: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      _count: { select: { participants: { where: { status: "REGISTERED" } } } },
    },
  })

  if (!tournament) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (tournament.status === "DRAFT") return NextResponse.json({ error: "Torneo no disponible" }, { status: 404 })

  const paymentEnabled = !!(tournament.business.onlinePaymentsEnabled && tournament.business.flowApiKey && tournament.business.flowSecretKey)

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      sport: tournament.sport,
      format: tournament.format,
      participantType: tournament.participantType,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      maxParticipants: tournament.maxParticipants,
      entryFee: tournament.entryFee,
      status: tournament.status,
      description: tournament.description,
      categories: tournament.categories,
      registeredCount: tournament._count.participants,
      business: { name: tournament.business.name, logoUrl: tournament.business.logoUrl },
      paymentEnabled,
    }
  })
}
