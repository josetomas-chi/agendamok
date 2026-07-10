import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tournamentId } = await params
  const body = await req.json()
  const { name, description } = body

  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const tournament = await prisma.tournament.findFirst({ where: { id: tournamentId, businessId: id } })
  if (!tournament) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const count = await prisma.tournamentCategory.count({ where: { tournamentId } })
  const category = await prisma.tournamentCategory.create({
    data: { tournamentId, name, description: description || null, sortOrder: count },
  })
  return NextResponse.json({ category }, { status: 201 })
}
