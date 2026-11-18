import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasBusinessAccess } from "@/lib/business-access"
import { z } from "zod"
import { addMinutes, format } from "date-fns"
import { es } from "date-fns/locale"
import { after } from "next/server"
import { sendBookingConfirmation, sendStaffBookingAlert } from "@/lib/email"
import { sendPushToUser } from "@/lib/push"
import { utcToChileLocal } from "@/lib/timezone"

const schema = z.object({
  serviceId: z.string().cuid(),
  staffId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  locationId: z.string().cuid().optional(),
  startTime: z.string(), // ISO string from browser (local timezone)
  notes: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).default("CONFIRMED"),
  eventCourtIds: z.array(z.string()).optional(),
})

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  if (!(await hasBusinessAccess(id, session.user.id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
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
      client: { select: { id: true, name: true, lastName: true, email: true, phone: true, rut: true, segment: true } },
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
  if (!(await hasBusinessAccess(id, session.user.id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } })
    if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

    // Resolve staffId: required for regular bookings; for events, prefer the booking user's staff record
    let staffId: string | null = data.staffId ?? null
    if (!staffId) {
      if (!service.isEvent) return NextResponse.json({ error: "Staff requerido" }, { status: 400 })
      const myStaff = await prisma.staffMember.findFirst({ where: { businessId: id, userId: session.user.id, deletedAt: null }, select: { id: true } })
      const fallback = myStaff ?? await prisma.staffMember.findFirst({ where: { businessId: id, deletedAt: null }, select: { id: true } })
      staffId = fallback?.id ?? null
    }

    const startTime = new Date(data.startTime)
    if (startTime < new Date()) {
      return NextResponse.json({ error: "No puedes crear un turno en un horario que ya pasó" }, { status: 400 })
    }
    const endTime = addMinutes(startTime, service.duration)

    // Check staff work schedule (skip for events without staff)
    const { utcToChileLocal } = await import("@/lib/timezone")
    const localStart = utcToChileLocal(startTime)
    const localEnd = utcToChileLocal(endTime)
    const dow = localStart.getDay()
    const startStr = `${String(localStart.getHours()).padStart(2, "0")}:${String(localStart.getMinutes()).padStart(2, "0")}`
    const endStr = `${String(localEnd.getHours()).padStart(2, "0")}:${String(localEnd.getMinutes()).padStart(2, "0")}`

    if (staffId) {
      const schedule = await prisma.workSchedule.findUnique({ where: { staffId_dayOfWeek: { staffId, dayOfWeek: dow } } })
      if (!schedule || !schedule.isWorking) {
        return NextResponse.json({ error: "El profesional no trabaja ese día" }, { status: 409 })
      }
      if (startStr < schedule.startTime || endStr > schedule.endTime) {
        return NextResponse.json({ error: `El horario está fuera del horario de trabajo del profesional (${schedule.startTime}–${schedule.endTime})` }, { status: 409 })
      }

      // Check availability exceptions for this staff + date
      const apptDate = startTime.toISOString().slice(0, 10)
      const apptTimeStr = `${String(startTime.getUTCHours()).padStart(2, "0")}:${String(startTime.getUTCMinutes()).padStart(2, "0")}`
      const apptDateObj = new Date(apptDate)
      const exceptions = await prisma.availabilityException.findMany({
        where: {
          staffId,
          date: { lte: apptDateObj },
          OR: [{ endDate: null }, { endDate: { gte: apptDateObj } }],
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
          const overlapping = await prisma.appointment.count({
            where: { staffId, deletedAt: null, status: { in: ["PENDING", "CONFIRMED"] }, startTime: { lt: endTime }, endTime: { gt: startTime } },
          })
          if (overlapping >= ex.capacity) {
            return NextResponse.json({ error: `Capacidad reducida para este día: máximo ${ex.capacity} personas` }, { status: 409 })
          }
          break
        }
      }

      // Check staff conflict
      const staffConflict = await prisma.appointment.findFirst({
        where: { staffId, deletedAt: null, status: { in: ["PENDING", "CONFIRMED"] }, startTime: { lt: endTime }, endTime: { gt: startTime } },
      })
      if (staffConflict) {
        return NextResponse.json({ error: "El profesional ya tiene un turno en ese horario" }, { status: 409 })
      }
    }

    // Normal capacity check for multi-capacity services
    if (service.capacity && service.capacity > 1) {
      const overlapping = await prisma.appointment.count({
        where: {
          serviceId: data.serviceId, deletedAt: null,
          status: { in: ["PENDING", "CONFIRMED"] },
          startTime: { lt: endTime }, endTime: { gt: startTime },
        },
      })
      if (overlapping >= service.capacity) {
        return NextResponse.json(
          { error: `Este horario ya está completo (capacidad máxima: ${service.capacity})` },
          { status: 409 }
        )
      }
    }

    let clientId = data.clientId
    if (!clientId && data.clientName) {
      let client = data.clientEmail
        ? await prisma.client.findFirst({ where: { businessId: id, email: data.clientEmail, deletedAt: null } })
        : null
      if (client) {
        // Update name/phone if changed
        const updates: Record<string, unknown> = {}
        if (data.clientPhone && !client.phone) updates.phone = data.clientPhone
        if (Object.keys(updates).length > 0)
          client = await prisma.client.update({ where: { id: client.id }, data: updates })
      } else {
        client = await prisma.client.create({
          data: { businessId: id, name: data.clientName, email: data.clientEmail, phone: data.clientPhone },
        })
      }
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

    // Apply holiday surcharge if applicable; always store service price
    let appointmentPrice: number | undefined = service.price ? Number(service.price) : undefined
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

    // Auto-block courts for event services
    let eventCourtBookingIds: string[] = []
    if (service.isEvent && (service.eventCourtIds as string[]).length > 0 && data.eventCourtIds?.length) {
      const selectedCourts = data.eventCourtIds.filter((cid: string) => (service.eventCourtIds as string[]).includes(cid))
      const blocks = await Promise.allSettled(
        selectedCourts.map((courtId: string) =>
          prisma.courtBooking.create({
            data: { businessId: id, courtId, clientId, startTime, endTime, price: 0, status: "CONFIRMED", blockType: "BOOKING", notes: `Evento: ${service.name}` },
            select: { id: true },
          })
        )
      )
      eventCourtBookingIds = blocks.flatMap(r => r.status === "fulfilled" ? [r.value.id] : [])
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId: id,
        serviceId: data.serviceId,
        staffId,
        clientId,
        locationId: data.locationId || null,
        startTime,
        endTime,
        status: data.status,
        notes: data.notes,
        ...(appointmentPrice !== undefined && { price: appointmentPrice }),
        ...(eventCourtBookingIds.length > 0 && { eventCourtBookingIds }),
      },
      include: {
        service: { select: { name: true, color: true, isEvent: true, eventIncludes: true } },
        staff: { select: { id: true, color: true, user: { select: { name: true, image: true } } } },
        client: { select: { id: true, name: true, lastName: true, email: true, phone: true, rut: true } },
      },
    })

    // Send emails after response
    const business = await prisma.business.findUnique({
      where: { id },
      select: { name: true, ownerId: true, owner: { select: { email: true } } },
    })
    const staffUser = staffId ? await prisma.staffMember.findUnique({
      where: { id: staffId },
      select: { user: { select: { email: true } } },
    }).catch(() => null) : null
    const staffEmail = staffUser?.user?.email ?? null
    const dateStr = format(utcToChileLocal(startTime), "EEEE d 'de' MMMM yyyy", { locale: es })
    const timeStr = format(utcToChileLocal(startTime), "HH:mm")
    const staffName = appointment.staff?.user.name || "Sin asignar"

    after(async () => {
      await Promise.allSettled([
        appointment.client?.email ? sendBookingConfirmation({
          clientName: appointment.client.name,
          clientEmail: appointment.client.email,
          businessName: business?.name || "",
          serviceName: appointment.service.name,
          staffName,
          date: dateStr,
          time: timeStr,
          duration: service.duration,
          startTimeISO: startTime.toISOString(),
          eventIncludes: appointment.service.eventIncludes ?? undefined,
        }) : Promise.resolve(),
        staffEmail && staffEmail !== business?.owner?.email ? sendStaffBookingAlert({
          staffEmail,
          staffName,
          businessName: business?.name || "",
          clientName: appointment.client?.name || "",
          clientEmail: appointment.client?.email || "",
          clientPhone: appointment.client?.phone || undefined,
          serviceName: appointment.service.name,
          date: dateStr,
          time: timeStr,
          duration: service.duration,
        }) : Promise.resolve(),
        business?.ownerId ? sendPushToUser(business.ownerId, {
          title: `Nueva reserva — ${business.name}`,
          body: `${appointment.client?.name || "Cliente"} · ${appointment.service.name} · ${dateStr} ${timeStr}`,
          url: "/dashboard",
        }) : Promise.resolve(),
      ])
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
