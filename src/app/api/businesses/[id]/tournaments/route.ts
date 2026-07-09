import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const tournaments = await prisma.tournament.findMany({
    where: { businessId: id },
    include: {
      _count: { select: { participants: true, matches: true } },
    },
    orderBy: { startDate: "desc" },
  })
  return NextResponse.json({ tournaments })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { name, sport, format, participantType, startDate, endDate, maxParticipants, courtCount, entryFee, description, groupCount, groupSize, advanceCount, categories, scheduleDays } = body

  if (!name || !startDate || !endDate) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })

  const tournament = await prisma.tournament.create({
    data: {
      businessId: id,
      name,
      sport: sport || null,
      format: format || "ELIMINATION",
      participantType: participantType || "INDIVIDUAL",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      courtCount: courtCount ? Number(courtCount) : null,
      entryFee: entryFee ? Number(entryFee) : null,
      description: description || null,
      groupCount: groupCount ? Number(groupCount) : null,
      groupSize: groupSize ? Number(groupSize) : null,
      advanceCount: advanceCount ? Number(advanceCount) : null,
      status: "OPEN",
    },
  })

  if (Array.isArray(categories) && categories.length > 0) {
    await prisma.tournamentCategory.createMany({
      data: categories.map((c: { name: string; sortOrder?: number; groupCount?: number; groupSize?: number }) => ({
        tournamentId: tournament.id,
        name: c.name,
        sortOrder: c.sortOrder ?? 0,
        groupCount: c.groupCount ?? null,
        groupSize: c.groupSize ?? null,
      })),
    })
  }

  if (Array.isArray(scheduleDays) && scheduleDays.length > 0) {
    await prisma.tournamentScheduleDay.createMany({
      data: scheduleDays.map((d: { date: string; startTime: string; endTime: string; sortOrder?: number }) => ({
        tournamentId: tournament.id,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
        sortOrder: d.sortOrder ?? 0,
      })),
    })
  }

  return NextResponse.json({ tournament }, { status: 201 })
}
