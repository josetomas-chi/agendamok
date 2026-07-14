import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendTournamentMatchAdvance } from "@/lib/email"

type Params = { params: Promise<{ id: string; tournamentId: string; matchId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { tournamentId, matchId } = await params
  const body = await req.json()
  const { score1, score2, sets, winnerId, status, scheduledTime, courtId, courtNumber } = body

  const match = await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: {
      ...(score1 !== undefined && { score1 }),
      ...(score2 !== undefined && { score2 }),
      ...(sets !== undefined && { sets: sets ?? [] }),
      ...(winnerId !== undefined && { winnerId: winnerId || null }),
      ...(status !== undefined && { status }),
      ...(scheduledTime !== undefined && { scheduledTime: scheduledTime ? new Date(scheduledTime) : null }),
      ...(courtId !== undefined && { courtId: courtId || null }),
      ...(courtNumber !== undefined && { courtNumber: courtNumber ? Number(courtNumber) : null }),
    },
    include: { participant1: true, participant2: true, winner: true },
  })

  // If elimination format and winner set: advance winner to next round
  if (winnerId && match.status === "FINISHED") {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { format: true, name: true },
    })
    if (tournament?.format === "ELIMINATION") {
      const nextRound = match.round + 1
      const nextMatchNumber = Math.ceil(match.matchNumber / 2)
      const isSlot1 = match.matchNumber % 2 === 1

      const nextMatch = await prisma.tournamentMatch.findFirst({
        where: { tournamentId, round: nextRound, matchNumber: nextMatchNumber },
        include: { participant1: true, participant2: true },
      })
      if (nextMatch) {
        const updated = await prisma.tournamentMatch.update({
          where: { id: nextMatch.id },
          data: isSlot1 ? { participant1Id: winnerId } : { participant2Id: winnerId },
          include: { participant1: true, participant2: true },
        })

        // Send advance email if both rivals are now known
        const p1 = updated.participant1
        const p2 = updated.participant2
        if (p1 && p2 && match.winner) {
          const winnerParticipant = match.winner
          const opponentParticipant = winnerParticipant.id === p1.id ? p2 : p1
          const winnerPlayers = Array.isArray(winnerParticipant.players)
            ? (winnerParticipant.players as { name: string; email?: string }[])
            : []
          sendTournamentMatchAdvance({
            winner: { name: winnerParticipant.name, email: winnerParticipant.email, players: winnerPlayers },
            opponent: { name: opponentParticipant.name },
            tournamentName: tournament.name,
            round: nextRound,
            scheduledTime: updated.scheduledTime?.toISOString() ?? null,
            courtNumber: updated.courtNumber ?? null,
          }).catch(() => {})
        }
      }
    }
  }

  return NextResponse.json({ match })
}
