import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessGetPaymentStatus, verifyBusinessWebhook } from "@/lib/flow"
import { sendBookingConfirmation, sendNewBookingAlert, sendInvoiceEmail } from "@/lib/email"
import { bsaleCreateDocument } from "@/lib/bsale"

type Params = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, name: true, flowApiKey: true, flowSecretKey: true, bsaleApiKey: true, bsaleAutoInvoice: true, bsaleDocType: true },
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

    // status: 1=pending, 2=paid, 3=rejected, 4=cancelled
    if (payment.status === 2) {
      const commerceOrder: string = payment.commerceOrder || ""
      const apptIdMatch = commerceOrder.match(/^appt_([^_]+)_/)
      if (!apptIdMatch) return NextResponse.json({ ok: true })

      const appointmentId = apptIdMatch[1]

      const appt = await prisma.appointment.findFirst({
        where: { id: appointmentId, businessId: business.id },
        include: {
          client: true,
          service: { select: { name: true, duration: true, price: true } },
          staff: { include: { user: true } },
        },
      })
      if (!appt) return NextResponse.json({ ok: true })

      // Mark appointment confirmed and upsert payment record atomically
      await prisma.$transaction([
        prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: "CONFIRMED" },
        }),
        prisma.payment.upsert({
          where: { appointmentId },
          create: {
            appointmentId,
            amount: Number(payment.amount ?? appt.service.price ?? 0),
            currency: "CLP",
            status: "COMPLETED",
            method: "ONLINE",
            paidAt: new Date(),
          },
          update: {
            status: "COMPLETED",
            paidAt: new Date(),
            amount: Number(payment.amount ?? appt.service.price ?? 0),
          },
        }),
      ])

      const dateStr = appt.startTime.toLocaleDateString("es-CL")
      const timeStr = appt.startTime.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })

      // Send confirmation email to client
      if (appt.client.email) {
        sendBookingConfirmation({
          clientName: appt.client.name,
          clientEmail: appt.client.email,
          businessName: business.name,
          serviceName: appt.service.name,
          staffName: appt.staff.user.name || "",
          date: dateStr,
          time: timeStr,
          duration: appt.service.duration,
          startTimeISO: appt.startTime.toISOString(),
        }).catch(() => { /* don't fail webhook on email error */ })
      }

      // Auto-emit Bsale invoice if configured
      if (business.bsaleApiKey && business.bsaleAutoInvoice) {
        try {
          const savedPayment = await prisma.payment.findUnique({ where: { appointmentId } })
          if (savedPayment && !await prisma.invoice.findUnique({ where: { paymentId: savedPayment.id } })) {
            const invoiceRecord = await prisma.invoice.create({
              data: {
                businessId: business.id,
                paymentId: savedPayment.id,
                docType: business.bsaleDocType,
                amount: savedPayment.amount,
                clientName: appt.client.name,
                clientEmail: appt.client.email,
                status: "PENDING",
              },
            })
            const result = await bsaleCreateDocument({
              apiKey: business.bsaleApiKey,
              docType: business.bsaleDocType,
              amount: Number(savedPayment.amount),
              clientName: appt.client.name,
              clientEmail: appt.client.email ?? undefined,
              description: appt.service.name,
            })
            await prisma.invoice.update({
              where: { id: invoiceRecord.id },
              data: { bsaleId: result.bsaleId, number: result.number, pdfUrl: result.pdfUrl, xmlUrl: result.xmlUrl ?? null, status: "EMITTED", emittedAt: new Date() },
            })
            if (appt.client.email && result.pdfUrl) {
              sendInvoiceEmail({ clientEmail: appt.client.email, clientName: appt.client.name, businessName: business.name, invoiceNumber: result.number, pdfUrl: result.pdfUrl }).catch(() => {})
            }
          }
        } catch (invoiceErr) {
          // Log error but don't fail webhook
          const msg = invoiceErr instanceof Error ? invoiceErr.message : "Unknown"
          await prisma.invoice.updateMany({ where: { appointmentId: undefined }, data: {} }).catch(() => {})
          console.error("Bsale auto-invoice error:", msg)
        }
      }

      // Alert business owner
      const biz = await prisma.business.findUnique({
        where: { id: business.id },
        select: { owner: { select: { name: true, email: true } } },
      })
      const owner = biz?.owner
      if (owner?.email) {
        sendNewBookingAlert({
          ownerEmail: owner.email,
          ownerName: owner.name || "",
          businessName: business.name,
          clientName: appt.client.name,
          clientEmail: appt.client.email || "",
          clientPhone: appt.client.phone || undefined,
          serviceName: appt.service.name,
          staffName: appt.staff.user.name || "",
          date: dateStr,
          time: timeStr,
        }).catch(() => { /* don't fail webhook on email error */ })
      }
    }
  } catch {
    // Flow expects 200 even on errors
  }

  return NextResponse.json({ ok: true })
}
