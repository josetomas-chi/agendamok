import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessGetPaymentStatus, verifyBusinessWebhook } from "@/lib/flow"
import { sendBookingConfirmation, sendNewBookingAlert } from "@/lib/email"

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
        await sendBookingConfirmation({
          clientName: appt.client.name,
          clientEmail: appt.client.email,
          businessName: business.name,
          serviceName: appt.service.name,
          staffName: appt.staff.user.name || "",
          date: dateStr,
          time: timeStr,
          duration: appt.service.duration,
        }).catch(() => { /* don't fail webhook on email error */ })
      }

      // Alert business owner
      const biz = await prisma.business.findUnique({
        where: { id: business.id },
        select: { owner: { select: { name: true, email: true } } },
      })
      const owner = biz?.owner
      if (owner?.email) {
        await sendNewBookingAlert({
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
