import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { addMinutes, format } from "date-fns"
import { es } from "date-fns/locale"
import { utcToChileLocal } from "@/lib/timezone"
import { sendRescheduleEmail } from "@/lib/email"

async function getClientEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("client-session")?.value
  if (!token) return null
  const session = await prisma.clientSession.findUnique({ where: { token } })
  if (!session || session.expiresAt < new Date()) return null
  return session.email
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await getClientEmail()
  if (!email) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id } = await params
  const { startTime: startTimeStr } = await req.json()
  if (!startTimeStr) return NextResponse.json({ error: "Falta startTime" }, { status: 400 })

  const newStart = new Date(startTimeStr)
  if (newStart < new Date()) {
    return NextResponse.json({ error: "No puedes reagendar a un horario que ya pasó" }, { status: 400 })
  }

  // Load appointment, verify it belongs to this client
  const appt = await prisma.appointment.findFirst({
    where: { id, deletedAt: null, client: { email } },
    include: {
      service: { select: { name: true, duration: true } },
      staff: { select: { id: true, user: { select: { name: true } } } },
      client: { select: { id: true, name: true, email: true } },
      business: { select: { name: true, slug: true } },
    },
  })
  if (!appt) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
  if (appt.status === "CANCELLED") return NextResponse.json({ error: "Este turno ya fue cancelado" }, { status: 400 })

  const newEnd = addMinutes(newStart, appt.service.duration)

  // Check staff availability at new time (exclude this appointment)
  if (appt.staffId) {
    const staffConflict = await prisma.appointment.count({
      where: {
        id: { not: id },
        staffId: appt.staffId,
        deletedAt: null,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    })
    if (staffConflict > 0) {
      return NextResponse.json({ error: "El profesional no está disponible en ese horario" }, { status: 409 })
    }
  }

  // Check client has no other conflicting appointment
  const clientConflict = await prisma.appointment.count({
    where: {
      id: { not: id },
      clientId: appt.clientId,
      deletedAt: null,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { lt: newEnd },
      endTime: { gt: newStart },
    },
  })
  if (clientConflict > 0) {
    return NextResponse.json({ error: "Ya tienes otro turno en ese horario" }, { status: 409 })
  }

  // Update
  await prisma.appointment.update({
    where: { id },
    data: { startTime: newStart, endTime: newEnd },
  })

  // Send reschedule email
  sendRescheduleEmail({
    clientName: appt.client.name,
    clientEmail: appt.client.email!,
    businessName: appt.business.name,
    serviceName: appt.service.name,
    staffName: appt.staff?.user.name || "Sin asignar",
    date: format(utcToChileLocal(newStart), "EEEE d 'de' MMMM yyyy", { locale: es }),
    time: format(utcToChileLocal(newStart), "HH:mm"),
    startTimeISO: newStart.toISOString(),
    duration: appt.service.duration,
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
