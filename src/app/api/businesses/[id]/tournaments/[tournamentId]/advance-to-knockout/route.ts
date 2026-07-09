import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string }> }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tournamentId } = await params

  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, businessId: id },
    include: {
      participants: true,
      matches: {
        where: { stage: "GROUP" },
        include: { participant1: true, participant2: true, winner: true },
      },
    },
  })
  if (!tournament) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const advanceCount = tournament.advanceCount ?? 2
  const groupLetters = [...new Set(tournament.participants.map(p => p.group).filter(Boolean))] as string[]
  groupLetters.sort()

  // Compute standings per group
  const qualifiers: typeof tournament.participants = []

  for (const letter of groupLetters) {
    const groupParticipants = tournament.participants.filter(p => p.group === letter)
    const groupMatches = tournament.matches.filter(m => m.group === letter && m.status === "FINISHED")

    const standings = groupParticipants.map(p => {
      const played = groupMatches.filter(m => m.participant1?.id === p.id || m.participant2?.id === p.id)
      const wins = played.filter(m => m.winner?.id === p.id).length
      const losses = played.length - wins
      const goalsFor = played.reduce((sum, m) => {
        const isP1 = m.participant1?.id === p.id
        const score = isP1 ? m.score1 : m.score2
        return sum + (parseInt(score ?? "0") || 0)
      }, 0)
      const goalsAgainst = played.reduce((sum, m) => {
        const isP1 = m.participant1?.id === p.id
        const score = isP1 ? m.score2 : m.score1
        return sum + (parseInt(score ?? "0") || 0)
      }, 0)
      return { participant: p, wins, losses, points: wins * 3, gf: goalsFor, ga: goalsAgainst, gd: goalsFor - goalsAgainst }
    }).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)

    qualifiers.push(...standings.slice(0, advanceCount).map(s => s.participant))
  }

  if (qualifiers.length < 2) return NextResponse.json({ error: "No hay suficientes clasificados" }, { status: 400 })

  // Delete existing knockout matches
  await prisma.tournamentMatch.deleteMany({ where: { tournamentId, stage: "KNOCKOUT" } })

  // Build elimination bracket with qualifiers
  // Seed: 1A vs 2B, 1B vs 2A, etc. (cross-group)
  const seeded: typeof qualifiers = []
  const perGroup = advanceCount
  for (let pos = 0; pos < perGroup; pos++) {
    for (let gi = 0; gi < groupLetters.length; gi++) {
      const letter = groupLetters[gi]
      const groupParticipants = tournament.participants.filter(p => p.group === letter)
      const groupMatches = tournament.matches.filter(m => m.group === letter && m.status === "FINISHED")
      const standings = groupParticipants.map(p => {
        const played = groupMatches.filter(m => m.participant1?.id === p.id || m.participant2?.id === p.id)
        const wins = played.filter(m => m.winner?.id === p.id).length
        const gf = played.reduce((s, m) => s + (parseInt((m.participant1?.id === p.id ? m.score1 : m.score2) ?? "0") || 0), 0)
        const ga = played.reduce((s, m) => s + (parseInt((m.participant1?.id === p.id ? m.score2 : m.score1) ?? "0") || 0), 0)
        return { p, points: wins * 3, gd: gf - ga, gf }
      }).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
      if (standings[pos]) seeded.push(standings[pos].p)
    }
  }

  // Cross-group bracket: 1A vs 2B, 1B vs 2A...
  // Alternate: even positions vs reversed odd positions
  const half = Math.ceil(seeded.length / 2)
  const top = seeded.slice(0, half)
  const bottom = seeded.slice(half).reverse()
  const ordered = top.flatMap((t, i) => [t, bottom[i]]).filter(Boolean)

  const n = Math.pow(2, Math.ceil(Math.log2(ordered.length)))
  const slots: (typeof qualifiers[0] | null)[] = [...ordered]
  while (slots.length < n) slots.push(null)

  const matchesData: { tournamentId: string; round: number; matchNumber: number; participant1Id: string | null; participant2Id: string | null; stage: string; group: null }[] = []
  for (let i = 0; i < n / 2; i++) {
    matchesData.push({
      tournamentId, round: 1, matchNumber: i + 1,
      participant1Id: slots[i * 2]?.id ?? null, participant2Id: slots[i * 2 + 1]?.id ?? null,
      stage: "KNOCKOUT", group: null,
    })
  }
  let mn = 1
  for (let r = 2; Math.pow(2, r - 1) <= n; r++) {
    const cnt = n / Math.pow(2, r)
    for (let m = 0; m < cnt; m++) {
      matchesData.push({ tournamentId, round: r, matchNumber: mn++, participant1Id: null, participant2Id: null, stage: "KNOCKOUT", group: null })
    }
  }

  await prisma.tournamentMatch.createMany({ data: matchesData })

  const updated = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      participants: true,
      matches: {
        include: { participant1: true, participant2: true, winner: true },
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
    },
  })
  return NextResponse.json({ tournament: updated })
}
