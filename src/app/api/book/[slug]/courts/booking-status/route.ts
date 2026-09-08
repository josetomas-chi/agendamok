import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessGetPaymentStatus } from "@/lib/flow"

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get("bookingId")
  const token = searchParams.get("token")

  if (!bookingId) return NextResponse.json({ status: "not_found" }, { status: 400 })

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, flowApiKey: true, flowSecretKey: true },
  })
  if (!business) return NextResponse.json({ status: "not_found" }, { status: 404 })

  const booking = await prisma.courtBooking.findFirst({
    where: { id: bookingId, businessId: business.id },
    select: { status: true },
  })
  if (!booking) return NextResponse.json({ status: "not_found" }, { status: 404 })

  // If already confirmed by webhook, return immediately
  if (booking.status === "CONFIRMED") return NextResponse.json({ status: "confirmed" })
  if (booking.status === "CANCELLED") return NextResponse.json({ status: "cancelled" })

  // Still PENDING — try to confirm via Flow API as fallback (for when webhook is delayed)
  if (token && business.flowApiKey && business.flowSecretKey) {
    try {
      const payment = await businessGetPaymentStatus(business.flowApiKey, business.flowSecretKey, token)
      if (payment.status === 2) {
        // Webhook hasn't fired yet but payment is confirmed — update manually
        await prisma.courtBooking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED", paidAmount: Number(payment.amount ?? 0), paidOnline: true },
        })
        return NextResponse.json({ status: "confirmed" })
      }
    } catch { /* webhook will handle it */ }
  }

  return NextResponse.json({ status: "pending" })
}
