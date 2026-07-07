import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { order }: { order: string[] } = await req.json()

  await prisma.$transaction(
    order.map((courtId, index) =>
      prisma.court.update({
        where: { id: courtId, businessId: id },
        data: { sortOrder: index },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
