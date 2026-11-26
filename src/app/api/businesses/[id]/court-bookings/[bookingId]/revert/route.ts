import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; bookingId: string }> }

export async function POST(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: businessId, bookingId } = await params

  const [owner, member] = await Promise.all([
    prisma.business.findFirst({ where: { id: businessId, ownerId: session.user.id }, select: { id: true } }),
    prisma.businessMember.findFirst({ where: { businessId, userId: session.user.id, acceptedAt: { not: null } }, select: { id: true } }),
  ])
  if (!owner && !member) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const booking = await prisma.courtBooking.findFirst({
    where: { id: bookingId, businessId, deletedAt: null, status: "COMPLETED" },
    select: { id: true },
  })
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada o no está completada" }, { status: 404 })

  await prisma.$transaction([
    prisma.courtBooking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED", paidAmount: 0, coachPaid: false },
    }),
    prisma.payment.deleteMany({ where: { courtBookingId: bookingId } }),
    prisma.courtBookingLog.create({
      data: {
        bookingId,
        fromStatus: "COMPLETED",
        toStatus: "CONFIRMED",
        source: "dashboard",
        meta: JSON.stringify({ userId: session.user.id, action: "revert" }),
      },
    }),
  ])

  return NextResponse.json({ ok: true })
}
