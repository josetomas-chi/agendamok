import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: businessId, bookingId } = await params

  const [owner, member] = await Promise.all([
    prisma.business.findFirst({ where: { id: businessId, ownerId: session.user.id }, select: { id: true } }),
    prisma.businessMember.findFirst({ where: { businessId, userId: session.user.id, acceptedAt: { not: null } }, select: { id: true } }),
  ])
  if (!owner && !member) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const booking = await prisma.courtBooking.findFirst({
    where: { id: bookingId, businessId, deletedAt: null },
    select: { id: true, price: true, transferVoucher: true },
  })
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  if (!booking.transferVoucher) return NextResponse.json({ error: "Sin comprobante adjunto" }, { status: 400 })

  await prisma.courtBooking.update({
    where: { id: bookingId },
    data: { paidAmount: booking.price },
  })

  return NextResponse.json({ ok: true })
}
