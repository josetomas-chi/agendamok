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
    include: { participants: { orderBy: [{ seed: "asc" }, { createdAt: "asc" }] } },
  })
  if (!tournament) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const participants = tournament.participants
  if (participants.length < 2) return NextResponse.json({ error: "Se necesitan al menos 2 participantes" }, { status: 400 })

  // Delete existing matches
  await prisma.tournamentMatch.deleteMany({ where: { tournamentId } })

  const matchesData: { tournamentId: string; round: number; matchNumber: number; participant1Id: string | null; participant2Id: string | null }[] = []

  if (tournament.format === "ELIMINATION") {
    // Seeded players in positions, rest shuffled
    const seeded = participants.filter(p => p.seed != null).sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
    const unseeded = shuffle(participants.filter(p => p.seed == null))
    const ordered = [...seeded, ...unseeded]

    // Pad to next power of 2
    const n = Math.pow(2, Math.ceil(Math.log2(ordered.length)))
    const slots: (typeof participants[0] | null)[] = [...ordered]
    while (slots.length < n) slots.push(null)

    // Round 1 matches
    for (let i = 0; i < n / 2; i++) {
      matchesData.push({
        tournamentId,
        round: 1,
        matchNumber: i + 1,
        participant1Id: slots[i * 2]?.id ?? null,
        participant2Id: slots[i * 2 + 1]?.id ?? null,
      })
    }

    // Subsequent rounds (empty placeholders)
    let matchNum = 1
    for (let r = 2; Math.pow(2, r - 1) <= n; r++) {
      const matchesInRound = n / Math.pow(2, r)
      for (let m = 0; m < matchesInRound; m++) {
        matchesData.push({ tournamentId, round: r, matchNumber: matchNum++, participant1Id: null, participant2Id: null })
      }
    }

  } else {
    // ROUND_ROBIN — all vs all
    let matchNum = 1
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matchesData.push({
          tournamentId,
          round: 1,
          matchNumber: matchNum++,
          participant1Id: participants[i].id,
          participant2Id: participants[j].id,
        })
      }
    }
  }

  await prisma.tournamentMatch.createMany({ data: matchesData })

  await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "IN_PROGRESS" } })

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
