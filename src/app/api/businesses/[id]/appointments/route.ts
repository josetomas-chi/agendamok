import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { addMinutes, parseISO, setHours, setMinutes } from "date-fns"

const schema = z.object({
  serviceId: z.string().cuid(),
  staffId: z.string().cuid(),
  clientId: z.string().cuid().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  date: z.string(),
  time: z.string(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).default("CONFIRMED"),
})

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)

  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const status = searchParams.get("status")
  const staffId = searchParams.get("staffId")

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: id,
      deletedAt: null,
      ...(from && to && { startTime: { gte: new Date(from), lte: new Date(to) } }),
      ...(status && { status: status as never }),
      ...(staffId && { staffId }),
    },
    include: {
      service: { select: { name: true, color: true, duration: true, price: true } },
      staff: { include: { user: { select: { name: true } } } },
      client: { select: { id: true, name: true, email: true, phone: true } },
      payment: { select: { amount: true, status: true, method: true } },
    },
    orderBy: { startTime: "desc" },
  })

  return NextResponse.json({ appointments })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } })
    if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

    const [h, m] = data.time.split(":").map(Number)
    const base = parseISO(data.date)
    const startTime = setMinutes(setHours(base, h), m)
    const endTime = addMinutes(startTime, service.duration)

    let clientId = data.clientId
    if (!clientId && data.clientName) {
      const client = await prisma.client.upsert({
        where: { id: "nonexistent" },
        update: {},
        create: {
          businessId: id,
          name: data.clientName,
          email: data.clientEmail,
          phone: data.clientPhone,
        },
      })
      clientId = client.id
    }

    if (!clientId) return NextResponse.json({ error: "Cliente requerido" }, { status: 400 })

    const appointment = await prisma.appointment.create({
      data: {
        businessId: id,
        serviceId: data.serviceId,
        staffId: data.staffId,
        clientId,
        startTime,
        endTime,
        status: data.status,
        notes: data.notes,
      },
      include: {
        service: { select: { name: true, color: true } },
        staff: { include: { user: { select: { name: true } } } },
        client: { select: { name: true, email: true, phone: true } },
      },
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
