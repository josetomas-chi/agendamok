import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string; dayId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, tournamentId, dayId } = await params
  const body = await req.json()

  const day = await prisma.tournamentScheduleDay.update({
    where: { id: dayId, tournamentId, tournament: { businessId: id } },
    data: {
      ...(body.allowRestrictions !== undefined && { allowRestrictions: !!body.allowRestrictions }),
    },
  })
  return NextResponse.json({ day })
}
