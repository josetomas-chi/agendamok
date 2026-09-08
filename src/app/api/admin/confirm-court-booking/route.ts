import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { businessGetPaymentStatus } from "@/lib/flow"

// Admin-only endpoint: manually confirm a PENDING court booking
// POST { bookingId, paidAmount? }
export async function POST(req: Request) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { bookingId, paidAmount: manualAmount } = await req.json()
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 })

  const booking = await prisma.courtBooking.findFirst({
    where: { id: bookingId },
    include: { business: { select: { flowApiKey: true, flowSecretKey: true } } },
  })
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (booking.status === "CONFIRMED") return NextResponse.json({ ok: true, already: true })

  // Try to get actual paid amount from Flow via stored ftoken
  let paidAmount = manualAmount ?? 0
  const ftokenMatch = booking.notes?.match(/\[ftoken:([^\]]+)\]/)
  if (ftokenMatch && booking.business.flowApiKey && booking.business.flowSecretKey) {
    try {
      const payment = await businessGetPaymentStatus(
        booking.business.flowApiKey,
        booking.business.flowSecretKey,
        ftokenMatch[1]
      )
      if (payment.status === 2) paidAmount = Number(payment.amount ?? paidAmount)
    } catch { /* use manual amount */ }
  }

  await prisma.$transaction([
    prisma.courtBooking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED", paidAmount, paidOnline: true },
    }),
    prisma.payment.create({
      data: {
        businessId: booking.businessId,
        courtBookingId: bookingId,
        amount: paidAmount,
        currency: "CLP",
        status: "PAID",
        method: "ONLINE",
        paidAt: new Date(),
      },
    }),
  ])

  return NextResponse.json({ ok: true, bookingId, paidAmount })
}
