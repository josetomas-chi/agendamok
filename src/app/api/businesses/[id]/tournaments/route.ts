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
  const { name, sport, format, participantType, startDate, endDate, maxParticipants, entryFee, description, groupCount, advanceCount } = body

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
      entryFee: entryFee ? Number(entryFee) : null,
      description: description || null,
      groupCount: groupCount ? Number(groupCount) : null,
      advanceCount: advanceCount ? Number(advanceCount) : null,
      status: "OPEN",
    },
  })
  return NextResponse.json({ tournament }, { status: 201 })
}
