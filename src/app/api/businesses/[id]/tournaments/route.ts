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
  const { name, sport, format, participantType, startDate, endDate, registrationDeadline, maxParticipants, courtCount, entryFee, description, groupCount, groupSize, advanceCount, categories, scheduleDays, allowScheduleRestrictions, maxRestrictionsPerParticipant } = body

  if (!name || !startDate || !endDate) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })

  // Generate unique slug from name
  const baseSlug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  let slug = baseSlug
  let suffix = 2
  while (await prisma.tournament.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const tournament = await prisma.tournament.create({
    data: {
      businessId: id,
      name,
      slug,
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
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      allowScheduleRestrictions: !!allowScheduleRestrictions,
      maxRestrictionsPerParticipant: Number(maxRestrictionsPerParticipant) || 0,
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
      data: scheduleDays.map((d: { date: string; startTime: string; endTime: string; sortOrder?: number; allowRestrictions?: boolean }) => ({
        tournamentId: tournament.id,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
        sortOrder: d.sortOrder ?? 0,
        allowRestrictions: d.allowRestrictions ?? true,
      })),
    })
  }

  return NextResponse.json({ tournament }, { status: 201 })
}
