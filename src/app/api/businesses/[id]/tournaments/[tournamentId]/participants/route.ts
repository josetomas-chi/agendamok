import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tournamentId } = await params
  const body = await req.json()
  const { name, players, seed } = body

  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const tournament = await prisma.tournament.findFirst({ where: { id: tournamentId, businessId: id } })
  if (!tournament) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  if (tournament.maxParticipants) {
    const count = await prisma.tournamentParticipant.count({ where: { tournamentId } })
    if (count >= tournament.maxParticipants)
      return NextResponse.json({ error: "Cupo máximo alcanzado" }, { status: 400 })
  }

  const participant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId,
      name,
      players: players || [],
      seed: seed ? Number(seed) : null,
    },
  })
  return NextResponse.json({ participant }, { status: 201 })
}
