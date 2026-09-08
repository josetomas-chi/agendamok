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
    select: { status: true, notes: true },
  })
  if (!booking) return NextResponse.json({ status: "not_found" }, { status: 404 })

  // If already confirmed by webhook, return immediately
  if (booking.status === "CONFIRMED") return NextResponse.json({ status: "confirmed" })
  if (booking.status === "CANCELLED") return NextResponse.json({ status: "cancelled" })

  // Resolve token: from URL param or from stored [ftoken:...] in notes
  const flowToken = token ?? booking.notes?.match(/\[ftoken:([^\]]+)\]/)?.[1] ?? null

  // Still PENDING — try to confirm via Flow API as fallback (for when webhook is delayed)
  if (flowToken && business.flowApiKey && business.flowSecretKey) {
    let flowError: string | null = null
    try {
      const payment = await businessGetPaymentStatus(business.flowApiKey, business.flowSecretKey, flowToken)
      if (payment.status === 2) {
        const paidAmount = Number(payment.amount ?? 0)
        await prisma.courtBooking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED", paidAmount, paidOnline: true },
        })
        await prisma.payment.upsert({
          where: { courtBookingId: bookingId },
          create: {
            businessId: business.id,
            courtBookingId: bookingId,
            amount: paidAmount,
            currency: "CLP",
            status: "PAID",
            method: "ONLINE",
            paidAt: new Date(),
          },
          update: { amount: paidAmount, status: "PAID", paidAt: new Date() },
        })
        return NextResponse.json({ status: "confirmed" })
      }
      flowError = `flow_status:${payment.status}`
    } catch (err) {
      flowError = err instanceof Error ? err.message : String(err)
    }
    return NextResponse.json({ status: "pending", debug: { bookingStatus: booking.status, flowError, hasToken: !!flowToken } })
  }

  return NextResponse.json({ status: "pending", debug: { bookingStatus: booking.status, hasToken: !!flowToken } })
}
