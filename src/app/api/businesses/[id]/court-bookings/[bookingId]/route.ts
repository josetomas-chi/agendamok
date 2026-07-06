import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; bookingId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, bookingId } = await params
  const body = await req.json()
  const booking = await prisma.courtBooking.update({
    where: { id: bookingId, businessId: id },
    data: body,
    include: {
      court: { select: { id: true, name: true, sport: true, color: true } },
      client: { select: { id: true, name: true, email: true, phone: true } },
    },
  })
  return NextResponse.json({ booking })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, bookingId } = await params
  await prisma.courtBooking.update({
    where: { id: bookingId, businessId: id },
    data: { deletedAt: new Date(), status: "CANCELLED" },
  })
  return NextResponse.json({ success: true })
}
