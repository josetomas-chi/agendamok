import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessGetPaymentStatus, verifyBusinessWebhook } from "@/lib/flow"

type Params = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, flowApiKey: true, flowSecretKey: true },
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

    // paymentData.status: 1=pending, 2=paid, 3=rejected, 4=cancelled
    if (payment.status === 2) {
      // Find the appointment by commerceOrder prefix "appt_<id>_..."
      const commerceOrder: string = payment.commerceOrder || ""
      const apptIdMatch = commerceOrder.match(/^appt_([^_]+)_/)
      if (apptIdMatch) {
        const appointmentId = apptIdMatch[1]
        await prisma.appointment.update({
          where: { id: appointmentId, businessId: business.id },
          data: { status: "CONFIRMED" },
        })
      }
    }
  } catch {
    // Log but don't fail — Flow expects 200
  }

  return NextResponse.json({ ok: true })
}
