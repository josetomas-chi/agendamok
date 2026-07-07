import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { addMinutes, format } from "date-fns"
import { es } from "date-fns/locale"
import { sendBookingConfirmation } from "@/lib/email"
import { utcToChileLocal } from "@/lib/timezone"

const schema = z.object({
  serviceId: z.string().cuid(),
  staffId: z.string().cuid(),
  clientId: z.string().cuid().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  locationId: z.string().cuid().optional(),
  startTime: z.string(), // ISO string from browser (local timezone)
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
      ...(status
        ? { status: status as never }
        : { status: { notIn: ["CANCELLED", "NO_SHOW"] as never[] } }),
      ...(staffId && { staffId }),
    },
    include: {
      service: { select: { name: true, color: true, duration: true, price: true } },
      staff: { select: { id: true, color: true, user: { select: { name: true, image: true } } } },
      client: { select: { id: true, name: true, email: true, phone: true, segment: true } },
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

    const startTime = new Date(data.startTime)
    if (startTime < new Date()) {
      return NextResponse.json({ error: "No puedes crear un turno en un horario que ya pasó" }, { status: 400 })
    }
    const endTime = addMinutes(startTime, service.duration)

    // Check availability exceptions for this staff + date
    const apptDate = startTime.toISOString().slice(0, 10)
    const apptTimeStr = `${String(startTime.getUTCHours()).padStart(2, "0")}:${String(startTime.getUTCMinutes()).padStart(2, "0")}`

    const apptDateObj = new Date(apptDate)
    const exceptions = await prisma.availabilityException.findMany({
      where: {
        staffId: data.staffId,
        date: { lte: apptDateObj },
        OR: [
          { endDate: null },
          { endDate: { gte: apptDateObj } },
        ],
      },
    })

    for (const ex of exceptions) {
      const fullDay = !ex.startTime && !ex.endTime
      const inRange = fullDay || (ex.startTime && ex.endTime && apptTimeStr >= ex.startTime && apptTimeStr < ex.endTime)
      if (!inRange) continue

      if (ex.type === "BLOCKED") {
        return NextResponse.json(
          { error: ex.reason ? `Profesional no disponible: ${ex.reason}` : "Profesional no disponible en ese horario" },
          { status: 409 }
        )
      }
      if (ex.type === "CAPACITY_OVERRIDE" && ex.capacity !== null) {
        // Use exception capacity instead of service capacity
        const overlapping = await prisma.appointment.count({
          where: {
            staffId: data.staffId, serviceId: data.serviceId, deletedAt: null,
            status: { in: ["PENDING", "CONFIRMED"] },
            startTime: { lt: endTime }, endTime: { gt: startTime },
          },
        })
        if (overlapping >= ex.capacity) {
          return NextResponse.json(
            { error: `Capacidad reducida para este día: máximo ${ex.capacity} personas` },
            { status: 409 }
          )
        }
        // Exception already handled capacity — skip normal check
        break
      }
    }

    // Normal capacity check (only if no CAPACITY_OVERRIDE exception matched)
    const hasOverride = exceptions.some((ex: { type: string; startTime: string | null; endTime: string | null }) => ex.type === "CAPACITY_OVERRIDE" && (!ex.startTime || (ex.startTime <= apptTimeStr && ex.endTime! > apptTimeStr)))
    if (!hasOverride) {
      const capacity = service.capacity ?? 1
      const overlapping = await prisma.appointment.count({
        where: {
          staffId: data.staffId, serviceId: data.serviceId, deletedAt: null,
          status: { in: ["PENDING", "CONFIRMED"] },
          startTime: { lt: endTime }, endTime: { gt: startTime },
        },
      })
      if (overlapping >= capacity) {
        return NextResponse.json(
          { error: `Este horario ya está completo (capacidad máxima: ${capacity})` },
          { status: 409 }
        )
      }
    }

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

    // Check if the client already has an overlapping appointment (any staff)
    const clientConflict = await prisma.appointment.count({
      where: {
        clientId,
        deletedAt: null,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    })
    if (clientConflict > 0) {
      return NextResponse.json(
        { error: "Este cliente ya tiene un turno en ese horario" },
        { status: 409 }
      )
    }

    // Apply holiday surcharge if applicable
    let appointmentPrice: number | undefined
    if (service.price) {
      const dayStart = new Date(startTime.toDateString())
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const holiday = await prisma.clubHoliday.findFirst({
        where: { businessId: id, date: { gte: dayStart, lt: dayEnd }, type: "SURCHARGE" },
      })
      if (holiday?.surchargeValue) {
        let p = Number(service.price)
        if (holiday.surchargeType === "PERCENT") p = p * (1 + holiday.surchargeValue / 100)
        else if (holiday.surchargeType === "FIXED") p = p + holiday.surchargeValue
        appointmentPrice = p
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId: id,
        serviceId: data.serviceId,
        staffId: data.staffId,
        clientId,
        locationId: data.locationId || null,
        startTime,
        endTime,
        status: data.status,
        notes: data.notes,
        ...(appointmentPrice !== undefined && { price: appointmentPrice }),
      },
      include: {
        service: { select: { name: true, color: true } },
        staff: { select: { id: true, color: true, user: { select: { name: true, image: true } } } },
        client: { select: { name: true, email: true, phone: true } },
      },
    })

    // Send confirmation email if client has email
    if (appointment.client?.email) {
      const business = await prisma.business.findUnique({ where: { id }, select: { name: true } })
      sendBookingConfirmation({
        clientName: appointment.client.name,
        clientEmail: appointment.client.email,
        businessName: business?.name || "",
        serviceName: appointment.service.name,
        staffName: appointment.staff.user.name || "Sin asignar",
        date: format(utcToChileLocal(startTime), "EEEE d 'de' MMMM yyyy", { locale: es }),
        time: format(utcToChileLocal(startTime), "HH:mm"),
        duration: service.duration,
        startTimeISO: startTime.toISOString(),
      }).catch((err) => { console.error("[email] sendBookingConfirmation failed:", err?.message ?? err) })
    }

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
