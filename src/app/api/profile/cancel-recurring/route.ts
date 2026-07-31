import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { recurringGroupId, scope } = await req.json() as {
    recurringGroupId: string
    scope: "future" | "all"
  }
  if (!recurringGroupId) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })

  const userId = session.user.id
  const clients = await prisma.client.findMany({
    where: { userId, deletedAt: null },
    select: { id: true },
  })
  const clientIds = clients.map(c => c.id)

  // Verify that at least one booking in this recurring group belongs to this user's clients
  const ownsBooking = await prisma.courtBooking.findFirst({
    where: { recurringGroupId, clientId: { in: clientIds }, deletedAt: null },
  })
  if (!ownsBooking) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const now = new Date()
  const where =
    scope === "all"
      ? { recurringGroupId, deletedAt: null }
      : { recurringGroupId, deletedAt: null, startTime: { gte: now } }

  await prisma.courtBooking.updateMany({
    where,
    data: { status: "CANCELLED", deletedAt: now },
  })

  return NextResponse.json({ ok: true })
}
