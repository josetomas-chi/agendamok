import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; groupId: string }> }

// GET: sesiones del grupo (pendientes de cobro y futuras primero)
export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { groupId } = await params
  const bookings = await prisma.courtBooking.findMany({
    where: { recurringGroupId: groupId, deletedAt: null, status: { not: "CANCELLED" } },
    orderBy: { startTime: "asc" },
    select: { id: true, startTime: true, endTime: true, price: true, status: true },
  })
  return NextResponse.json({ bookings })
}

// DELETE: cancela todas las sesiones futuras del grupo (o todas si from=all)
export async function DELETE(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, groupId } = await params
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get("scope") ?? "future" // "future" | "all"

  const now = new Date()

  const where =
    scope === "all"
      ? { recurringGroupId: groupId, businessId: id, deletedAt: null }
      : { recurringGroupId: groupId, businessId: id, deletedAt: null, startTime: { gte: now } }

  await prisma.courtBooking.updateMany({
    where,
    data: { status: "CANCELLED", deletedAt: now },
  })

  return NextResponse.json({ success: true })
}
