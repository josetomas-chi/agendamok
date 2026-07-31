import { NextResponse } from "next/server"
import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { addMinutes, format } from "date-fns"
import { es } from "date-fns/locale"
import { sendBookingConfirmation, sendNewBookingAlert, sendStaffBookingAlert } from "@/lib/email"

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true,
      owner: { select: { name: true, email: true } },
      clubSettings: { select: { bookingWindowDays: true } },
    },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const body = await req.json()
  const { serviceId, staffId, startTime, clientName, clientEmail, clientPhone, notes } = body

  if (!serviceId || !staffId || !startTime || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Campos requeridos: serviceId, staffId, startTime, clientName, clientEmail" }, { status: 400 })
  }

  const start = new Date(startTime)
  if (start <= new Date()) {
    return NextResponse.json({ error: "No se puede reservar en el pasado" }, { status: 400 })
  }
  const windowDays = business.clubSettings?.bookingWindowDays ?? 30
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + windowDays)
  if (start > maxDate) {
    return NextResponse.json({ error: `Solo se puede reservar con hasta ${windowDays} días de anticipación` }, { status: 400 })
  }

  const service = await prisma.service.findFirst({ where: { id: serviceId, businessId: business.id } })
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

  // Find or create client, actualizando nombre si ya existe
  const session = await auth()
  const loggedUserId = session?.user?.id ?? null

  let client = await prisma.client.findFirst({ where: { businessId: business.id, email: clientEmail, deletedAt: null } })
  if (client) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: { name: clientName, phone: clientPhone || null, ...(loggedUserId && !client.userId ? { userId: loggedUserId } : {}) },
    })
  } else {
    client = await prisma.client.create({
      data: { businessId: business.id, name: clientName, email: clientEmail, phone: clientPhone || null, ...(loggedUserId ? { userId: loggedUserId } : {}) },
    })
  }

  const end = addMinutes(start, Number(service.duration))

  // Check staff work schedule
  const { utcToChileLocal } = await import("@/lib/timezone")
  const localStart = utcToChileLocal(start)
  const localEnd = utcToChileLocal(end)
  const dow = localStart.getDay()
  const startStr = `${String(localStart.getHours()).padStart(2, "0")}:${String(localStart.getMinutes()).padStart(2, "0")}`
  const endStr = `${String(localEnd.getHours()).padStart(2, "0")}:${String(localEnd.getMinutes()).padStart(2, "0")}`
  const schedule = await prisma.workSchedule.findUnique({ where: { staffId_dayOfWeek: { staffId, dayOfWeek: dow } } })
  if (!schedule || !schedule.isWorking) {
    return NextResponse.json({ error: "El profesional no trabaja ese día" }, { status: 409 })
  }
  if (startStr < schedule.startTime || endStr > schedule.endTime) {
    return NextResponse.json({ error: `Horario fuera del horario de trabajo del profesional (${schedule.startTime}–${schedule.endTime})` }, { status: 409 })
  }

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
    where: { id: staffId }, select: { user: { select: { name: true, email: true } } },
  }).catch((e) => { console.error("[book/appointments] staffRecord query error:", e); return null })
  const staffMember = { name: staffRecord?.user?.name ?? "", email: staffRecord?.user?.email ?? null }
  console.log("[book/appointments] staffMember resolved:", { name: staffMember.name, email: staffMember.email })

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

  // Emails después de responder — no bloquean la confirmación al cliente
  after(async () => {
    console.log("[book/appointments] after() firing, staffMember.email:", staffMember.email)
    const results = await Promise.allSettled([
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
      staffMember.email && staffMember.email !== business.owner?.email ? sendStaffBookingAlert({
        staffEmail: staffMember.email,
        staffName,
        businessName: business.name,
        clientName,
        clientEmail,
        clientPhone: clientPhone || undefined,
        serviceName: service.name,
        date: dateStr,
        time: timeStr,
        duration: Number(service.duration),
      }) : Promise.resolve(),
    ])
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`[book/appointments] email[${i}] failed:`, r.reason)
      else console.log(`[book/appointments] email[${i}] ok`)
    })
  })

  return NextResponse.json({ appointment }, { status: 201 })
}
