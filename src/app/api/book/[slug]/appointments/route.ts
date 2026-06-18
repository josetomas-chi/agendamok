import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMinutes } from "date-fns"

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const body = await req.json()
  const { serviceId, staffId, startTime, clientName, clientEmail, clientPhone, notes } = body

  if (!serviceId || !staffId || !startTime || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Campos requeridos: serviceId, staffId, startTime, clientName, clientEmail" }, { status: 400 })
  }

  const service = await prisma.service.findFirst({ where: { id: serviceId, businessId: business.id } })
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

  // Find or create client
  let client = await prisma.client.findFirst({
    where: { businessId: business.id, email: clientEmail },
  })
  if (!client) {
    client = await prisma.client.create({
      data: { businessId: business.id, name: clientName, email: clientEmail, phone: clientPhone || null },
    })
  }

  const start = new Date(startTime)
  const end = addMinutes(start, Number(service.duration))

  // Check no overlap
  const conflict = await prisma.appointment.findFirst({
    where: {
      businessId: business.id,
      staffId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      deletedAt: null,
      OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
    },
  })
  if (conflict) return NextResponse.json({ error: "Ese horario ya no está disponible" }, { status: 409 })

  const appointment = await prisma.appointment.create({
    data: {
      businessId: business.id,
      serviceId,
      staffId,
      clientId: client.id,
      startTime: start,
      endTime: end,
      notes: notes || null,
      status: "CONFIRMED",
    },
    select: { id: true, startTime: true, endTime: true, status: true },
  })

  return NextResponse.json({ appointment }, { status: 201 })
}
