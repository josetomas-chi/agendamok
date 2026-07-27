import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMpPayment } from "@/lib/mercadopago"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.type !== "payment" && body.topic !== "payment") {
      return NextResponse.json({ ok: true })
    }

    const paymentId = body.data?.id || body.id
    if (!paymentId) return NextResponse.json({ ok: true })

    const platformToken = process.env.MP_ACCESS_TOKEN
    if (!platformToken) return NextResponse.json({ ok: true })

    const payment = await getMpPayment(paymentId, platformToken)
    if (payment.status !== "approved") return NextResponse.json({ ok: true })

    const externalRef: string = payment.external_reference || ""

    if (externalRef.startsWith("appt_")) {
      const appointmentId = externalRef.replace("appt_", "")
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { payment: true },
      })
      if (!appt) return NextResponse.json({ ok: true })

      if (appt.payment) {
        await prisma.payment.update({
          where: { id: appt.payment.id },
          data: {
            status: "PAID",
            paidAt: new Date(),
            mpPaymentId: String(paymentId),
            method: "MERCADOPAGO",
          },
        })
      } else {
        await prisma.payment.create({
          data: {
            businessId: appt.businessId,
            appointmentId: appt.id,
            amount: payment.transaction_amount,
            method: "MERCADOPAGO",
            status: "PAID",
            paidAt: new Date(),
            mpPaymentId: String(paymentId),
          },
        })
      }
    }

    if (externalRef.startsWith("booking_")) {
      const bookingId = externalRef.replace("booking_", "")
      await prisma.courtBooking.update({
        where: { id: bookingId },
        data: {
          status: "CONFIRMED",
          paidOnline: true,
          mpPaymentId: String(paymentId),
          paidAmount: payment.transaction_amount,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("MP webhook error:", e)
    return NextResponse.json({ ok: true })
  }
}
