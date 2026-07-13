import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { bookingIds } = await req.json()
  if (!Array.isArray(bookingIds) || bookingIds.length === 0)
    return NextResponse.json({ error: "bookingIds requerido" }, { status: 400 })

  const bookings = await prisma.courtBooking.findMany({
    where: { id: { in: bookingIds }, businessId: id, deletedAt: null },
    select: { id: true, price: true },
  })

  await prisma.courtBooking.updateMany({
    where: { id: { in: bookingIds }, businessId: id, deletedAt: null },
    data: { status: "COMPLETED" },
  })

  await Promise.all(bookings.map(b =>
    prisma.payment.upsert({
      where: { courtBookingId: b.id },
      create: { courtBookingId: b.id, amount: b.price, status: "COMPLETED", method: "CASH", paidAt: new Date() },
      update: { amount: b.price, status: "COMPLETED", paidAt: new Date() },
    })
  ))

  return NextResponse.json({ updated: bookingIds.length })
}
