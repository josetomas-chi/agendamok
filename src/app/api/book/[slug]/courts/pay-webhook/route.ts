import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessGetPaymentStatus, verifyBusinessWebhook } from "@/lib/flow"
import { sendCourtBookingConfirmation } from "@/lib/email"
import { bsaleCreateDocument } from "@/lib/bsale"
import { sendInvoiceEmail } from "@/lib/email"

type Params = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true, flowApiKey: true, flowSecretKey: true,
      bsaleApiKey: true, bsaleAutoInvoice: true, bsaleDocType: true,
      owner: { select: { name: true, email: true } },
    },
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

      await prisma.$transaction([
        prisma.courtBooking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED", paidAmount, paidOnline: true },
        }),
        prisma.payment.create({
          data: {
            businessId: business.id,
            courtBookingId: bookingId,
            amount: paidAmount,
            currency: "CLP",
            status: "PAID",
            method: "ONLINE",
            paidAt: new Date(),
          },
        }),
      ])

      // Client confirmation email
      if (booking.client.email) {
        sendCourtBookingConfirmation({
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

      // Owner alert email
      const owner = business.owner
      if (owner?.email) {
        const dateStr = booking.startTime.toLocaleDateString("es-CL")
        const timeStr = booking.startTime.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
        const { Resend } = await import("resend")
        const resend = new Resend(process.env.RESEND_API_KEY)
        resend.emails.send({
          from: "AgendaMok <no-reply@agendamok.cl>",
          to: owner.email,
          subject: `Nueva reserva de cancha — ${booking.client.name} · ${booking.court.name}`,
          html: `<p>Hola ${owner.name ?? ""},</p><p><strong>${booking.client.name}</strong> reservó <strong>${booking.court.name}</strong> el ${dateStr} a las ${timeStr} hrs y pagó $${paidAmount.toLocaleString("es-CL")} online.</p>`,
        }).catch(() => {})
      }

      // Auto-emit Bsale invoice if configured
      if (business.bsaleApiKey && business.bsaleAutoInvoice) {
        try {
          const savedPayment = await prisma.payment.findFirst({ where: { courtBookingId: bookingId, status: "PAID" } })
          if (savedPayment) {
            const invoiceRecord = await prisma.invoice.create({
              data: {
                businessId: business.id,
                paymentId: savedPayment.id,
                docType: business.bsaleDocType,
                amount: savedPayment.amount,
                clientName: booking.client.name,
                clientEmail: booking.client.email,
                status: "PENDING",
              },
            })
            const result = await bsaleCreateDocument({
              apiKey: business.bsaleApiKey,
              docType: business.bsaleDocType,
              amount: paidAmount,
              clientName: booking.client.name,
              clientEmail: booking.client.email ?? undefined,
              description: `Cancha ${booking.court.name}`,
            })
            await prisma.invoice.update({
              where: { id: invoiceRecord.id },
              data: { bsaleId: result.bsaleId, number: result.number, pdfUrl: result.pdfUrl, xmlUrl: result.xmlUrl ?? null, status: "EMITTED", emittedAt: new Date() },
            })
            if (booking.client.email && result.pdfUrl) {
              sendInvoiceEmail({ clientEmail: booking.client.email, clientName: booking.client.name, businessName: business.name, invoiceNumber: result.number, pdfUrl: result.pdfUrl }).catch(() => {})
            }
          }
        } catch {
          // Don't fail webhook on invoice error
        }
      }
    } else if (payment.status === 3 || payment.status === 4) {
      // Payment rejected or cancelled — mark booking as CANCELLED to free the slot
      const commerceOrder: string = payment.commerceOrder || ""
      const match = commerceOrder.match(/^court_([^_]+)_/)
      if (match) {
        const bookingId = match[1]
        await prisma.courtBooking.updateMany({
          where: { id: bookingId, businessId: business.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        })
      }
    }
  } catch {
    // Flow expects 200
  }

  return NextResponse.json({ ok: true })
}
