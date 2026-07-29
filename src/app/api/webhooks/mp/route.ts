import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMpPayment } from "@/lib/mercadopago"
import { sendBookingConfirmation, sendNewBookingAlert, sendCourtBookingConfirmation } from "@/lib/email"
import { utcToChileLocal } from "@/lib/timezone"

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
        include: {
          payment: true,
          client: true,
          service: { select: { name: true, duration: true, price: true } },
          staff: { include: { user: { select: { name: true } } } },
          business: { select: { id: true, name: true, owner: { select: { name: true, email: true } } } },
        },
      })
      if (!appt) return NextResponse.json({ ok: true })

      // Verify this payment belongs to the correct business (cross-business IDOR prevention)
      const mpBusinessId = payment.metadata?.business_id
      if (mpBusinessId && mpBusinessId !== appt.businessId) return NextResponse.json({ ok: true })

      await prisma.$transaction([
        prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: "CONFIRMED" },
        }),
        appt.payment
          ? prisma.payment.update({
              where: { id: appt.payment.id },
              data: { status: "PAID", paidAt: new Date(), mpPaymentId: String(paymentId), method: "MERCADOPAGO" },
            })
          : prisma.payment.create({
              data: {
                businessId: appt.businessId,
                appointmentId: appt.id,
                amount: payment.transaction_amount,
                currency: "CLP",
                method: "MERCADOPAGO",
                status: "PAID",
                paidAt: new Date(),
                mpPaymentId: String(paymentId),
              },
            }),
      ])

      const localApptStart = utcToChileLocal(appt.startTime)
      const dateStr = localApptStart.toLocaleDateString("es-CL")
      const timeStr = localApptStart.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })

      if (appt.client.email) {
        sendBookingConfirmation({
          clientName: appt.client.name,
          clientEmail: appt.client.email,
          businessName: appt.business.name,
          serviceName: appt.service.name,
          staffName: appt.staff?.user.name || "",
          date: dateStr,
          time: timeStr,
          duration: appt.service.duration,
          startTimeISO: appt.startTime.toISOString(),
        }).catch(() => {})
      }

      const owner = appt.business.owner
      if (owner?.email) {
        sendNewBookingAlert({
          ownerEmail: owner.email,
          ownerName: owner.name || "",
          businessName: appt.business.name,
          clientName: appt.client.name,
          clientEmail: appt.client.email || "",
          clientPhone: appt.client.phone || undefined,
          serviceName: appt.service.name,
          staffName: appt.staff?.user.name || "",
          date: dateStr,
          time: timeStr,
        }).catch(() => {})
      }
    }

    if (externalRef.startsWith("booking_")) {
      const bookingId = externalRef.replace("booking_", "")
      const booking = await prisma.courtBooking.findUnique({
        where: { id: bookingId },
        include: {
          client: true,
          court: true,
          business: { select: { id: true, name: true, owner: { select: { name: true, email: true } } } },
        },
      })
      if (!booking) return NextResponse.json({ ok: true })

      // Verify ownership
      const mpBusinessId = payment.metadata?.business_id
      if (mpBusinessId && mpBusinessId !== booking.businessId) return NextResponse.json({ ok: true })

      const paidAmount = Number(payment.transaction_amount ?? 0)

      await prisma.$transaction([
        prisma.courtBooking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED", paidOnline: true, mpPaymentId: String(paymentId), paidAmount },
        }),
        prisma.payment.create({
          data: {
            businessId: booking.businessId,
            courtBookingId: bookingId,
            amount: paidAmount,
            currency: "CLP",
            method: "MERCADOPAGO",
            status: "PAID",
            paidAt: new Date(),
            mpPaymentId: String(paymentId),
          },
        }),
      ])

      if (booking.client.email) {
        sendCourtBookingConfirmation({
          clientName: booking.client.name,
          clientEmail: booking.client.email,
          businessName: booking.business.name,
          courtName: booking.court.name,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          price: Number(booking.price),
          paidAmount,
        }).catch(() => {})
      }

      const owner = booking.business.owner
      if (owner?.email) {
        const localBookingStart = utcToChileLocal(booking.startTime)
        const dateStr = localBookingStart.toLocaleDateString("es-CL")
        const timeStr = localBookingStart.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
        const { Resend } = await import("resend")
        const resend = new Resend(process.env.RESEND_API_KEY)
        resend.emails.send({
          from: "AgendaMok <no-reply@agendamok.cl>",
          to: owner.email,
          subject: `Nueva reserva de cancha — ${booking.client.name} · ${booking.court.name}`,
          html: `<p>Hola ${owner.name ?? ""},</p><p><strong>${booking.client.name}</strong> reservó <strong>${booking.court.name}</strong> el ${dateStr} a las ${timeStr} hrs y pagó $${paidAmount.toLocaleString("es-CL")} con MercadoPago.</p>`,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("MP webhook error:", e)
    return NextResponse.json({ ok: true })
  }
}
