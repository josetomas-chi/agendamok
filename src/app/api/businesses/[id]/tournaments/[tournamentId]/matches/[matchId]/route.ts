import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendTournamentMatchAdvance, sendTournamentElimination, sendTournamentChampion } from "@/lib/email"

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
    include: { participant1: true, participant2: true, winner: { select: { id: true, name: true, email: true, players: true } } },
  })

  // If elimination-style match with winner: advance and notify
  const isEliminationStyle =
    winnerId &&
    match.status === "FINISHED" &&
    (match.stage === "KNOCKOUT" || true) // always check format below
  if (isEliminationStyle) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { format: true, name: true },
    })
    const isElimFormat = tournament?.format === "ELIMINATION"
    const isKnockoutStage = match.stage === "KNOCKOUT"

    if (isElimFormat || isKnockoutStage) {
      const loserParticipant = match.participant1?.id === winnerId ? match.participant2 : match.participant1

      const nextRound = match.round + 1
      const nextMatchNumber = Math.ceil(match.matchNumber / 2)
      const isSlot1 = match.matchNumber % 2 === 1

      const nextMatch = await prisma.tournamentMatch.findFirst({
        where: { tournamentId, round: nextRound, matchNumber: nextMatchNumber },
        include: { participant1: true, participant2: true },
      })

      if (nextMatch) {
        // Not the final — advance winner to next match
        const updated = await prisma.tournamentMatch.update({
          where: { id: nextMatch.id },
          data: isSlot1 ? { participant1Id: winnerId } : { participant2Id: winnerId },
          include: { participant1: true, participant2: true },
        })

        // Notify loser
        if (loserParticipant && match.winner && tournament) {
          const loserPlayers = Array.isArray(loserParticipant.players)
            ? (loserParticipant.players as { name: string; email?: string }[])
            : []
          sendTournamentElimination({
            loser: { name: loserParticipant.name, email: loserParticipant.email, players: loserPlayers },
            winner: { name: match.winner.name },
            tournamentName: tournament.name,
            round: match.round,
          }).catch(() => {})
        }

        // Notify winner if next opponent is already known
        const p1 = updated.participant1
        const p2 = updated.participant2
        if (p1 && p2 && match.winner && tournament) {
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
      } else {
        // No next match — this was the final: notify champion and runner-up
        if (match.winner && tournament) {
          const winnerPlayers = Array.isArray(match.winner.players)
            ? (match.winner.players as { name: string; email?: string }[])
            : []
          sendTournamentChampion({
            champion: { name: match.winner.name, email: match.winner.email, players: winnerPlayers },
            tournamentName: tournament.name,
          }).catch(() => {})
        }
        if (loserParticipant && match.winner && tournament) {
          const loserPlayers = Array.isArray(loserParticipant.players)
            ? (loserParticipant.players as { name: string; email?: string }[])
            : []
          sendTournamentElimination({
            loser: { name: loserParticipant.name, email: loserParticipant.email, players: loserPlayers },
            winner: { name: match.winner.name },
            tournamentName: tournament.name,
            round: match.round,
            isFinal: true,
          }).catch(() => {})
        }
      }
    }
  }

  return NextResponse.json({ match })
}
