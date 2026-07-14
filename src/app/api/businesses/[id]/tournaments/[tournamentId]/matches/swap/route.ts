import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string }> }

// Swap scheduledTime + courtNumber between two matches
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { tournamentId } = await params
  const { matchAId, matchBId } = await req.json()

  if (!matchAId || !matchBId || matchAId === matchBId) {
    return NextResponse.json({ error: "Se requieren dos partidos distintos" }, { status: 400 })
  }

  const [a, b] = await Promise.all([
    prisma.tournamentMatch.findFirst({ where: { id: matchAId, tournamentId } }),
    prisma.tournamentMatch.findFirst({ where: { id: matchBId, tournamentId } }),
  ])

  if (!a || !b) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })

  await prisma.$transaction([
    prisma.tournamentMatch.update({
      where: { id: matchAId },
      data: { scheduledTime: b.scheduledTime, courtNumber: b.courtNumber },
    }),
    prisma.tournamentMatch.update({
      where: { id: matchBId },
      data: { scheduledTime: a.scheduledTime, courtNumber: a.courtNumber },
    }),
  ])

  const [updatedA, updatedB] = await Promise.all([
    prisma.tournamentMatch.findUnique({ where: { id: matchAId }, include: { participant1: true, participant2: true, winner: true } }),
    prisma.tournamentMatch.findUnique({ where: { id: matchBId }, include: { participant1: true, participant2: true, winner: true } }),
  ])

  return NextResponse.json({ matchA: updatedA, matchB: updatedB })
}
