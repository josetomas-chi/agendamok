import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tournamentId } = await params

  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, businessId: id },
    include: {
      categories: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      participants: { orderBy: [{ seed: "asc" }, { createdAt: "asc" }] },
      matches: {
        include: { participant1: true, participant2: true, winner: true },
        orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
      },
      scheduleDays: { orderBy: { sortOrder: "asc" } },
    },
  })
  if (!tournament) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ tournament })
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tournamentId } = await params
  const body = await req.json()
  const { name, sport, format, participantType, startDate, endDate, maxParticipants, courtCount, entryFee, description, status } = body

  const tournament = await prisma.tournament.update({
    where: { id: tournamentId, businessId: id },
    data: {
      ...(name !== undefined && { name }),
      ...(sport !== undefined && { sport: sport || null }),
      ...(format !== undefined && { format }),
      ...(participantType !== undefined && { participantType }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(maxParticipants !== undefined && { maxParticipants: maxParticipants ? Number(maxParticipants) : null }),
      ...(courtCount !== undefined && { courtCount: courtCount ? Number(courtCount) : null }),
      ...(entryFee !== undefined && { entryFee: entryFee ? Number(entryFee) : null }),
      ...(description !== undefined && { description: description || null }),
      ...(status !== undefined && { status }),
    },
  })
  return NextResponse.json({ tournament })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tournamentId } = await params

  await prisma.tournament.delete({ where: { id: tournamentId, businessId: id } })
  return NextResponse.json({ success: true })
}
