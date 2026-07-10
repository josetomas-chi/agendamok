import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string }> }

// GET — ranking actual de la escalerilla (filtrado por categoryId si se pasa)
export async function GET(req: Request, { params }: Params) {
  const { id, tournamentId } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, businessId: id },
  })
  if (!tournament) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId") || null

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId, status: { not: "CANCELLED" }, ...(categoryId ? { categoryId } : {}) },
    orderBy: [{ ladderPosition: "asc" }, { createdAt: "asc" }],
  })

  const participantIds = participants.map(p => p.id)

  const challenges = await prisma.tournamentMatch.findMany({
    where: {
      tournamentId,
      status: { not: "CANCELLED" },
      ...(categoryId ? {
        OR: [
          { participant1Id: { in: participantIds } },
          { participant2Id: { in: participantIds } },
        ]
      } : {}),
    },
    include: { participant1: true, participant2: true, winner: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ participants, challenges })
}

// POST — crear un desafío (partido entre dos participantes de la escalerilla)
export async function POST(req: Request, { params }: Params) {
  const { id, tournamentId } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { challengerId, defenderId, scheduledTime, categoryId } = await req.json()
  if (!challengerId || !defenderId) {
    return NextResponse.json({ error: "challengerId y defenderId son requeridos" }, { status: 400 })
  }

  const [challenger, defender] = await Promise.all([
    prisma.tournamentParticipant.findFirst({ where: { id: challengerId, tournamentId } }),
    prisma.tournamentParticipant.findFirst({ where: { id: defenderId, tournamentId } }),
  ])
  if (!challenger || !defender) {
    return NextResponse.json({ error: "Participante no encontrado" }, { status: 404 })
  }
  if ((challenger.ladderPosition ?? 999) <= (defender.ladderPosition ?? 999)) {
    return NextResponse.json({ error: "El retador debe tener una posición inferior al defensor" }, { status: 400 })
  }

  // Contar desafíos existentes para usar como matchNumber
  const count = await prisma.tournamentMatch.count({ where: { tournamentId } })

  const match = await prisma.tournamentMatch.create({
    data: {
      tournamentId,
      categoryId: categoryId || null,
      round: 1,
      matchNumber: count + 1,
      participant1Id: challengerId,
      participant2Id: defenderId,
      status: "PENDING",
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
    },
    include: { participant1: true, participant2: true },
  })

  return NextResponse.json({ match }, { status: 201 })
}

// PATCH — reordenar posiciones (admin) o registrar resultado de desafío
export async function PATCH(req: Request, { params }: Params) {
  const { id, tournamentId } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()

  // Reordenar: [{ id, ladderPosition }]
  if (body.reorder) {
    const updates = body.reorder as { id: string; ladderPosition: number }[]
    await Promise.all(
      updates.map(u =>
        prisma.tournamentParticipant.update({
          where: { id: u.id },
          data: { ladderPosition: u.ladderPosition },
        })
      )
    )
    return NextResponse.json({ ok: true })
  }

  // Registrar resultado de desafío: { matchId, winnerId }
  if (body.matchId && body.winnerId) {
    const match = await prisma.tournamentMatch.findFirst({
      where: { id: body.matchId, tournamentId },
      include: { participant1: true, participant2: true },
    })
    if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })

    const challenger = match.participant1
    const defender = match.participant2
    if (!challenger || !defender) return NextResponse.json({ error: "Participantes inválidos" }, { status: 400 })

    const challengerPos = challenger.ladderPosition ?? 999
    const defenderPos = defender.ladderPosition ?? 999

    await prisma.$transaction(async (tx) => {
      const validSets = Array.isArray(body.sets) ? body.sets : null
      const setsP1 = validSets ? validSets.filter((s: { s1: number; s2: number }) => s.s1 > s.s2).length : null
      const setsP2 = validSets ? validSets.filter((s: { s1: number; s2: number }) => s.s2 > s.s1).length : null
      await tx.tournamentMatch.update({
        where: { id: body.matchId },
        data: {
          winnerId: body.winnerId,
          status: "FINISHED",
          sets: validSets ?? undefined,
          score1: setsP1 !== null ? String(setsP1) : undefined,
          score2: setsP2 !== null ? String(setsP2) : undefined,
        },
      })

      if (body.winnerId === challenger.id) {
        // Ganó el retador:
        // - El ganador sube al puesto del perdedor (defenderPos)
        // - El perdedor y todos los que estaban entre ambos bajan un escalón
        // Ejemplo: retador en pos 5 vence a defensor en pos 2
        //   → retador pasa a pos 2
        //   → quienes estaban en pos 2, 3, 4 pasan a pos 3, 4, 5
        await tx.tournamentParticipant.updateMany({
          where: {
            tournamentId,
            id: { not: challenger.id },
            ladderPosition: { gte: defenderPos, lt: challengerPos },
          },
          data: { ladderPosition: { increment: 1 } },
        })
        await tx.tournamentParticipant.update({
          where: { id: challenger.id },
          data: { ladderPosition: defenderPos },
        })
      }
      // Si gana el defensor → no cambian posiciones
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 })
}
