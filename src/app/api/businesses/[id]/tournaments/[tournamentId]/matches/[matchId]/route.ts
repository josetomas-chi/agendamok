import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string; matchId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { tournamentId, matchId } = await params
  const body = await req.json()
  const { score1, score2, winnerId, status, scheduledTime, courtId } = body

  const match = await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: {
      ...(score1 !== undefined && { score1 }),
      ...(score2 !== undefined && { score2 }),
      ...(winnerId !== undefined && { winnerId: winnerId || null }),
      ...(status !== undefined && { status }),
      ...(scheduledTime !== undefined && { scheduledTime: scheduledTime ? new Date(scheduledTime) : null }),
      ...(courtId !== undefined && { courtId: courtId || null }),
    },
    include: { participant1: true, participant2: true, winner: true },
  })

  // If elimination format and winner set: advance winner to next round
  if (winnerId && match.status === "FINISHED") {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
    if (tournament?.format === "ELIMINATION") {
      const nextRound = match.round + 1
      const nextMatchNumber = Math.ceil(match.matchNumber / 2)
      const isSlot1 = match.matchNumber % 2 === 1

      const nextMatch = await prisma.tournamentMatch.findFirst({
        where: { tournamentId, round: nextRound, matchNumber: nextMatchNumber },
      })
      if (nextMatch) {
        await prisma.tournamentMatch.update({
          where: { id: nextMatch.id },
          data: isSlot1 ? { participant1Id: winnerId } : { participant2Id: winnerId },
        })
      }
    }
  }

  return NextResponse.json({ match })
}
