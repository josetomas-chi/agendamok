import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessGetPaymentStatus, verifyBusinessWebhook } from "@/lib/flow"
import { sendCourtBookingConfirmation } from "@/lib/email"

type Params = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, name: true, flowApiKey: true, flowSecretKey: true },
  })
  if (!business?.flowApiKey || !business?.flowSecretKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 })
  }

  const body = await req.text()
  const rawParams = Object.fromEntries(new URLSearchParams(body))

  if (!verifyBusinessWebhook(business.flowSecretKey, rawParams)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
  }

  const { token } = rawParams
  if (!token) return NextResponse.json({ ok: true })

  try {
    const payment = await businessGetPaymentStatus(business.flowApiKey, business.flowSecretKey, token)

    if (payment.status === 2) {
      const commerceOrder: string = payment.commerceOrder || ""
      // commerceOrder format: court_<bookingId>_<timestamp>
      const match = commerceOrder.match(/^court_([^_]+)_/)
      if (!match) return NextResponse.json({ ok: true })

      const bookingId = match[1]
      const booking = await prisma.courtBooking.findFirst({
        where: { id: bookingId, businessId: business.id },
        include: { client: true, court: true },
      })
      if (!booking) return NextResponse.json({ ok: true })

      const paidAmount = Number(payment.amount ?? 0)

      await prisma.courtBooking.update({
        where: { id: bookingId },
        data: {
          status: "CONFIRMED",
          paidAmount,
          paidOnline: true,
        },
      })

      if (booking.client.email) {
        await sendCourtBookingConfirmation({
          clientName: booking.client.name,
          clientEmail: booking.client.email,
          businessName: business.name,
          courtName: booking.court.name,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          price: Number(booking.price),
          paidAmount,
        }).catch(() => {})
      }
    }
  } catch {
    // Flow expects 200
  }

  return NextResponse.json({ ok: true })
}
