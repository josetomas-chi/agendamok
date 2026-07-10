import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMinutes, format } from "date-fns"
import { es } from "date-fns/locale"
import { sendBookingConfirmation, sendNewBookingAlert } from "@/lib/email"

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, name: true, owner: { select: { name: true, email: true } } },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const body = await req.json()
  const { serviceId, staffId, startTime, clientName, clientEmail, clientPhone, notes } = body

  if (!serviceId || !staffId || !startTime || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Campos requeridos: serviceId, staffId, startTime, clientName, clientEmail" }, { status: 400 })
  }

  const service = await prisma.service.findFirst({ where: { id: serviceId, businessId: business.id } })
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

  // Upsert client — actualiza nombre y teléfono con lo que ingresó en el formulario
  const client = await prisma.client.upsert({
    where: { businessId_email: { businessId: business.id, email: clientEmail } },
    update: { name: clientName, phone: clientPhone || null },
    create: { businessId: business.id, name: clientName, email: clientEmail, phone: clientPhone || null },
  })

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

  const staffRecord = await prisma.staffMember.findUnique({
    where: { id: staffId }, select: { user: { select: { name: true } } },
  }).catch(() => null)
  const staffMember = { name: staffRecord?.user.name ?? "" }

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

  const dateStr = format(start, "EEEE d 'de' MMMM yyyy", { locale: es })
  const timeStr = format(start, "HH:mm")
  const staffName = staffMember.name || "Sin asignar"

  // Emails — awaited para que no se corten en serverless
  await Promise.allSettled([
    sendBookingConfirmation({
      clientName,
      clientEmail,
      businessName: business.name,
      serviceName: service.name,
      staffName,
      date: dateStr,
      time: timeStr,
      duration: Number(service.duration),
      startTimeISO: start.toISOString(),
    }),
    business.owner?.email ? sendNewBookingAlert({
      ownerEmail: business.owner.email,
      ownerName: business.owner.name ?? business.name,
      businessName: business.name,
      clientName,
      clientEmail,
      clientPhone: clientPhone || undefined,
      serviceName: service.name,
      staffName,
      date: dateStr,
      time: timeStr,
    }) : Promise.resolve(),
  ])

  return NextResponse.json({ appointment }, { status: 201 })
}
