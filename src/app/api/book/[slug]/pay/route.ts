import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessCreatePayment } from "@/lib/flow"

type Params = { params: Promise<{ slug: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true,
      flowApiKey: true, flowSecretKey: true, onlinePaymentsEnabled: true,
    },
  })

  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  if (!business.onlinePaymentsEnabled || !business.flowApiKey || !business.flowSecretKey) {
    return NextResponse.json({ error: "Pagos online no habilitados" }, { status: 400 })
  }

  const body = await req.json()
  const { appointmentId, amount, email, serviceName } = body

  if (!appointmentId || !amount || !email) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
  }

  // Verify appointment belongs to this business and is pending payment
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId: business.id },
  })
  if (!appt) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })

  const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"
  const commerceOrder = `appt_${appointmentId}_${Date.now()}`

  try {
    const result = await businessCreatePayment(
      business.flowApiKey,
      business.flowSecretKey,
      {
        commerceOrder,
        subject: `Reserva: ${serviceName} — ${business.name}`,
        amount: Math.round(Number(amount)),
        email,
        urlReturn: `${baseUrl}/book/${slug}/payment-result?orderId=${commerceOrder}`,
        urlConfirmation: `${baseUrl}/api/book/${slug}/payment-webhook`,
      }
    )

    // Store the commerce order on the appointment for reconciliation
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "PENDING" },
    })

    return NextResponse.json({ url: result.url, token: result.token })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
