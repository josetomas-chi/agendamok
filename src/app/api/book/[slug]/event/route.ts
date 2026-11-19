import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendBookingConfirmation } from "@/lib/email"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const schema = z.object({
  serviceId: z.string().cuid(),
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, name: true, phone: true },
  })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, businessId: business.id, isEvent: true, isActive: true, deletedAt: null },
    })
    if (!service) return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })

    // Find or create client
    let client = data.clientEmail
      ? await prisma.client.findFirst({ where: { businessId: business.id, email: data.clientEmail, deletedAt: null } })
      : null
    if (!client) {
      client = await prisma.client.create({
        data: { businessId: business.id, name: data.clientName, email: data.clientEmail, phone: data.clientPhone },
      })
    }

    // Create appointment with PENDING status and no specific time (use a placeholder far future date)
    const startTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now as placeholder
    const endTime = new Date(startTime.getTime() + service.duration * 60000)

    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        serviceId: service.id,
        staffId: null,
        clientId: client.id,
        startTime,
        endTime,
        status: "PENDING",
        notes: data.notes || null,
        price: service.price ? Number(service.price) : undefined,
      },
      include: {
        service: { select: { name: true, isEvent: true, eventIncludes: true } },
      },
    })

    // Send confirmation email
    if (data.clientEmail) {
      const dateStr = format(startTime, "EEEE d 'de' MMMM yyyy", { locale: es })
      sendBookingConfirmation({
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        businessName: business.name,
        serviceName: service.name,
        staffName: "Por confirmar",
        date: dateStr,
        time: "Por confirmar",
        duration: service.duration,
        isEvent: true,
        eventIncludes: service.eventIncludes,
        businessPhone: business.phone,
      }).catch(() => {})
    }

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    console.error(e)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
