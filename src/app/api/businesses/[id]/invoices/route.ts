import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { bsaleCreateDocument } from "@/lib/bsale"
import { sendInvoiceEmail } from "@/lib/email"

// POST /api/businesses/[id]/invoices
// Body: { paymentId, clientName?, clientRut?, clientEmail? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: businessId } = await params

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, name: true, bsaleApiKey: true, bsaleDocType: true },
  })

  if (!business || business.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (!business.bsaleApiKey) {
    return NextResponse.json({ error: "Bsale no configurado. Ve a Configuración > Facturación." }, { status: 400 })
  }

  const body = await req.json()
  const { paymentId, clientName, clientRut, clientEmail } = body as {
    paymentId: string
    clientName?: string
    clientRut?: string
    clientEmail?: string
  }

  if (!paymentId) return NextResponse.json({ error: "paymentId requerido" }, { status: 400 })

  // Verificar que el pago pertenece a este negocio y está completado
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      appointment: {
        include: {
          service: true,
          client: true,
          business: { select: { id: true } },
        },
      },
      invoice: true,
    },
  })

  if (!payment || payment.appointment.business.id !== businessId) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 })
  }

  if (payment.invoice) {
    return NextResponse.json({ error: "Ya existe una boleta para este pago", invoice: payment.invoice }, { status: 409 })
  }

  // Datos del cliente desde el appointment si no vienen en el body
  const finalClientName  = clientName  ?? payment.appointment.client.name
  const finalClientEmail = clientEmail ?? payment.appointment.client.email ?? undefined

  // Crear registro Invoice en PENDING antes de llamar a Bsale
  const invoice = await prisma.invoice.create({
    data: {
      businessId,
      paymentId,
      docType: business.bsaleDocType,
      amount: payment.amount,
      clientName: finalClientName,
      clientRut: clientRut ?? null,
      clientEmail: finalClientEmail ?? null,
      status: "PENDING",
    },
  })

  try {
    const result = await bsaleCreateDocument({
      apiKey: business.bsaleApiKey,
      docType: business.bsaleDocType,
      amount: Number(payment.amount),
      clientName: finalClientName,
      clientRut,
      clientEmail: finalClientEmail,
      description: payment.appointment.service.name,
    })

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        bsaleId: result.bsaleId,
        number: result.number,
        pdfUrl: result.pdfUrl,
        xmlUrl: result.xmlUrl ?? null,
        status: "EMITTED",
        emittedAt: new Date(),
      },
    })

    // Enviar PDF por email si hay dirección
    if (finalClientEmail && result.pdfUrl) {
      await sendInvoiceEmail({
        clientEmail: finalClientEmail,
        clientName: finalClientName,
        businessName: business.name,
        invoiceNumber: result.number,
        pdfUrl: result.pdfUrl,
      }).catch(() => {}) // no romper si el email falla
    }

    return NextResponse.json({ invoice: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "ERROR", errorMessage: message },
    })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

// GET /api/businesses/[id]/invoices?paymentId=xxx
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: businessId } = await params
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { ownerId: true } })
  if (!business || business.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const paymentId = req.nextUrl.searchParams.get("paymentId")

  if (paymentId) {
    const invoice = await prisma.invoice.findUnique({ where: { paymentId } })
    return NextResponse.json({ invoice })
  }

  const invoices = await prisma.invoice.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return NextResponse.json({ invoices })
}
