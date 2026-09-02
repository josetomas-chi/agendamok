import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ slug: string; bookingId: string }> }

export async function PATCH(_: Request, { params }: Params) {
  const { slug, bookingId } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true,
      clubSettings: { select: { cancellationHoursNotice: true } },
    },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const booking = await prisma.courtBooking.findFirst({
    where: { id: bookingId, businessId: business.id, status: { notIn: ["CANCELLED"] }, deletedAt: null },
    select: { id: true, startTime: true, clientId: true },
  })
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })

  const hoursNotice = business.clubSettings?.cancellationHoursNotice ?? 24
  const hoursUntil = (new Date(booking.startTime).getTime() - Date.now()) / (1000 * 60 * 60)

  if (hoursUntil < hoursNotice) {
    return NextResponse.json(
      { error: `Solo se puede cancelar con ${hoursNotice}h de anticipación. Contacta al club para cancelar.` },
      { status: 422 }
    )
  }

  await prisma.courtBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  })

  return NextResponse.json({ success: true })
}
