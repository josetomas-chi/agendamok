import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string }> }

const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Assign scheduledTime and courtNumber cycling through available courts
// matches are ordered; each slot is SLOT_DURATION minutes, courts run in parallel
function assignSchedule(
  matches: { participant1Id: string | null; participant2Id: string | null; [k: string]: unknown }[],
  startDate: Date,
  courtCount: number,
  slotMinutes = 90
) {
  const courts = courtCount > 0 ? courtCount : 1
  return matches.map((m, i) => {
    const slotIndex = Math.floor(i / courts)  // which time slot
    const courtNumber = (i % courts) + 1      // which court (1-based)
    const scheduledTime = new Date(startDate.getTime() + slotIndex * slotMinutes * 60 * 1000)
    return { ...m, scheduledTime, courtNumber }
  })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tournamentId } = await params
  const body = await req.json().catch(() => ({}))
  const categoryId: string | null = body.categoryId ?? null

  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, businessId: id },
    include: { participants: { where: categoryId ? { categoryId } : {}, orderBy: [{ seed: "asc" }, { createdAt: "asc" }] } },
  })
  if (!tournament) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const participants = tournament.participants
  if (participants.length < 2) return NextResponse.json({ error: "Se necesitan al menos 2 participantes" }, { status: 400 })

  await prisma.tournamentMatch.deleteMany({ where: { tournamentId, ...(categoryId ? { categoryId } : {}) } })

  const courtCount = tournament.courtCount ?? 1
  const startDate = tournament.startDate  // DateTime with time included

  type MatchData = {
    tournamentId: string; round: number; matchNumber: number
    participant1Id: string | null; participant2Id: string | null
    stage: string; group: string | null; categoryId: string | null
    scheduledTime: Date | null; courtNumber: number | null
  }
  const matchesRaw: Omit<MatchData, "scheduledTime" | "courtNumber">[] = []

  if (tournament.format === "GROUP_STAGE") {
    const groupCount = tournament.groupCount ?? 2
    const seeded = participants.filter(p => p.seed != null).sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
    const unseeded = shuffle(participants.filter(p => p.seed == null))
    const ordered = [...seeded, ...unseeded]

    const groups: typeof participants[] = Array.from({ length: groupCount }, () => [])
    ordered.forEach((p, i) => {
      const cycle = Math.floor(i / groupCount)
      const pos = i % groupCount
      const groupIdx = cycle % 2 === 0 ? pos : groupCount - 1 - pos
      groups[groupIdx].push(p)
    })

    for (let g = 0; g < groups.length; g++) {
      const letter = GROUP_LETTERS[g]
      await prisma.tournamentParticipant.updateMany({
        where: { id: { in: groups[g].map(p => p.id) } },
        data: { group: letter },
      })
      let matchNum = 1
      for (let i = 0; i < groups[g].length; i++) {
        for (let j = i + 1; j < groups[g].length; j++) {
          matchesRaw.push({
            tournamentId, round: 1, matchNumber: matchNum++,
            participant1Id: groups[g][i].id, participant2Id: groups[g][j].id,
            stage: "GROUP", group: letter, categoryId,
          })
        }
      }
    }
  } else if (tournament.format === "ELIMINATION") {
    const seeded = participants.filter(p => p.seed != null).sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
    const unseeded = shuffle(participants.filter(p => p.seed == null))
    const ordered = [...seeded, ...unseeded]
    const n = Math.pow(2, Math.ceil(Math.log2(ordered.length)))
    const slots: (typeof participants[0] | null)[] = [...ordered]
    while (slots.length < n) slots.push(null)

    for (let i = 0; i < n / 2; i++) {
      matchesRaw.push({
        tournamentId, round: 1, matchNumber: i + 1,
        participant1Id: slots[i * 2]?.id ?? null, participant2Id: slots[i * 2 + 1]?.id ?? null,
        stage: "KNOCKOUT", group: null, categoryId,
      })
    }
    let matchNum = 1
    for (let r = 2; Math.pow(2, r - 1) <= n; r++) {
      const matchesInRound = n / Math.pow(2, r)
      for (let m = 0; m < matchesInRound; m++) {
        matchesRaw.push({ tournamentId, round: r, matchNumber: matchNum++, participant1Id: null, participant2Id: null, stage: "KNOCKOUT", group: null, categoryId })
      }
    }
  } else {
    // ROUND_ROBIN
    let matchNum = 1
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matchesRaw.push({
          tournamentId, round: 1, matchNumber: matchNum++,
          participant1Id: participants[i].id, participant2Id: participants[j].id,
          stage: "KNOCKOUT", group: null, categoryId,
        })
      }
    }
  }

  // Assign schedule: only to first-round matches with both participants known
  const playableFirst = matchesRaw.filter(m => m.participant1Id && m.participant2Id && m.round === 1)
  const futureMatches = matchesRaw.filter(m => !(m.participant1Id && m.participant2Id && m.round === 1))

  const scheduled = assignSchedule(playableFirst, startDate, courtCount)

  const matchesData: MatchData[] = [
    ...scheduled.map(m => ({
      ...m,
      scheduledTime: m.scheduledTime,
      courtNumber: m.courtNumber,
    })),
    ...futureMatches.map(m => ({ ...m, scheduledTime: null, courtNumber: null })),
  ]

  await prisma.tournamentMatch.createMany({
    data: matchesData.map(m => ({
      tournamentId: m.tournamentId,
      round: m.round,
      matchNumber: m.matchNumber,
      participant1Id: m.participant1Id,
      participant2Id: m.participant2Id,
      stage: m.stage,
      group: m.group,
      categoryId: m.categoryId,
      scheduledTime: m.scheduledTime,
      courtNumber: m.courtNumber,
    })),
  })
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
