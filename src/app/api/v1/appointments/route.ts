import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiKey } from "@/lib/apikey"
import { addMinutes } from "date-fns"

export async function GET(req: Request) {
  const businessId = await authenticateApiKey(req)
  if (!businessId) return NextResponse.json({ error: "API key inválida" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      deletedAt: null,
      ...(from && to && { startTime: { gte: new Date(from), lte: new Date(to) } }),
    },
    select: {
      id: true, startTime: true, endTime: true, status: true, notes: true,
      service: { select: { name: true, duration: true } },
      staff: { select: { user: { select: { name: true } } } },
      client: { select: { name: true, email: true, phone: true } },
    },
    orderBy: { startTime: "asc" },
    take: 100,
  })

  return NextResponse.json({ appointments })
}

export async function POST(req: Request) {
  const businessId = await authenticateApiKey(req)
  if (!businessId) return NextResponse.json({ error: "API key inválida" }, { status: 401 })

  const body = await req.json()
  const { serviceId, staffId, startTime, clientName, clientEmail, clientPhone, notes } = body

  if (!serviceId || !staffId || !startTime || !clientName) {
    return NextResponse.json({ error: "Campos requeridos: serviceId, staffId, startTime, clientName" }, { status: 400 })
  }

  const service = await prisma.service.findFirst({ where: { id: serviceId, businessId } })
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

  const staff = await prisma.staffMember.findFirst({ where: { id: staffId, businessId } })
  if (!staff) return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 })

  // Find or create client
  let clientId: string | null = null
  if (clientEmail) {
    let client = await prisma.client.findFirst({ where: { businessId, email: clientEmail } })
    if (!client) {
      client = await prisma.client.create({
        data: { businessId, name: clientName, email: clientEmail, phone: clientPhone || null },
      })
    }
    clientId = client.id
  } else {
    const client = await prisma.client.create({
      data: { businessId, name: clientName, phone: clientPhone || null },
    })
    clientId = client.id
  }

  const start = new Date(startTime)
  const end = addMinutes(start, Number(service.duration))

  const appointment = await prisma.appointment.create({
    data: {
      businessId,
      serviceId,
      staffId,
      clientId,
      startTime: start,
      endTime: end,
      notes: notes || null,
      status: "CONFIRMED",
    },
    select: {
      id: true, startTime: true, endTime: true, status: true,
      service: { select: { name: true } },
      staff: { select: { user: { select: { name: true } } } },
    },
  })

  return NextResponse.json({ appointment }, { status: 201 })
}
