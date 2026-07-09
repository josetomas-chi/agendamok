import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string; participantId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { participantId } = await params
  const body = await req.json()

  const participant = await prisma.tournamentParticipant.update({
    where: { id: participantId },
    data: {
      ...(body.group !== undefined && { group: body.group || null }),
      ...(body.seed !== undefined && { seed: body.seed !== null ? Number(body.seed) : null }),
    },
  })
  return NextResponse.json({ participant })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { participantId } = await params

  await prisma.tournamentParticipant.delete({ where: { id: participantId } })
  return NextResponse.json({ success: true })
}
