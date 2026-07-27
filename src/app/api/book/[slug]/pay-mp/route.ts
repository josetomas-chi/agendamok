import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createMpPreference } from "@/lib/mercadopago"

type Params = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true, currency: true,
      mpAccessToken: true, mpConnected: true,
    },
  })

  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  if (!business.mpConnected || !business.mpAccessToken) {
    return NextResponse.json({ error: "MercadoPago no configurado" }, { status: 400 })
  }

  const body = await req.json()
  const { appointmentId, amount, serviceName } = body

  if (!appointmentId || !amount) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
  }

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId: business.id },
  })
  if (!appt) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })

  const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"

  try {
    const preference = await createMpPreference({
      accessToken: business.mpAccessToken,
      title: `${serviceName} — ${business.name}`,
      amount: Math.round(Number(amount)),
      currency: business.currency || "CLP",
      externalReference: `appt_${appointmentId}`,
      successUrl: `${baseUrl}/book/${slug}/payment-result?mp=success&appt=${appointmentId}`,
      failureUrl: `${baseUrl}/book/${slug}/payment-result?mp=failure&appt=${appointmentId}`,
      pendingUrl: `${baseUrl}/book/${slug}/payment-result?mp=pending&appt=${appointmentId}`,
      notificationUrl: `${baseUrl}/api/webhooks/mp`,
    })

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "PENDING" },
    })

    return NextResponse.json({ url: preference.init_point })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
