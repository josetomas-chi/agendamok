import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ tournamentId: string }> }

function calcStats(participantId: string, matches: { id: string; status: string; participant1Id: string | null; participant2Id: string | null; winnerId: string | null; score1: string | null; score2: string | null; sets: unknown }[]) {
  const played = matches.filter(
    m => m.status === "FINISHED" && (m.participant1Id === participantId || m.participant2Id === participantId)
  )
  let wins = 0, losses = 0, setsW = 0, setsL = 0, gamesW = 0, gamesL = 0

  for (const m of played) {
    const isP1 = m.participant1Id === participantId
    const won = m.winnerId === participantId
    won ? wins++ : losses++

    const sets = Array.isArray(m.sets) ? m.sets as { s1: number; s2: number }[] : null
    if (sets?.length) {
      for (const s of sets) {
        const myG = isP1 ? s.s1 : s.s2
        const opG = isP1 ? s.s2 : s.s1
        gamesW += myG; gamesL += opG
        if (myG > opG) setsW++
        else if (opG > myG) setsL++
      }
    } else {
      const myScore = parseInt((isP1 ? m.score1 : m.score2) ?? "0") || 0
      const opScore = parseInt((isP1 ? m.score2 : m.score1) ?? "0") || 0
      setsW += myScore; setsL += opScore
    }
  }

  return { played: played.length, wins, losses, setsW, setsL, gamesW, gamesL, pts: wins * 3 }
}

export async function GET(_: Request, { params }: Params) {
  const { tournamentId } = await params

  const tournament = await prisma.tournament.findFirst({
    where: { OR: [{ id: tournamentId }, { slug: tournamentId }] },
    select: { id: true, status: true, participantType: true },
  })
  if (!tournament) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (tournament.status === "DRAFT") return NextResponse.json({ error: "No disponible" }, { status: 404 })

  const [participants, matches] = await Promise.all([
    prisma.tournamentParticipant.findMany({
      where: { tournamentId: tournament.id, status: "REGISTERED" },
      select: { id: true, name: true, players: true, group: true, categoryId: true, seed: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tournamentMatch.findMany({
      where: { tournamentId: tournament.id },
      select: {
        id: true, round: true, matchNumber: true, status: true, stage: true, group: true, categoryId: true,
        scheduledTime: true, courtNumber: true, sets: true,
        score1: true, score2: true,
        participant1Id: true, participant2Id: true, winnerId: true,
        participant1: { select: { id: true, name: true, players: true } },
        participant2: { select: { id: true, name: true, players: true } },
        winner: { select: { id: true, name: true } },
      },
      orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
    }),
  ])

  const standings = participants
    .map(p => ({ ...p, ...calcStats(p.id, matches) }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins || b.setsW - a.setsW || b.gamesW - a.gamesW)

  return NextResponse.json({ standings, matches, participantType: tournament.participantType })
}
