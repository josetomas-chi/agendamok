import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { parseISO, addMinutes, setHours, setMinutes, format } from "date-fns"
import { chileLocalToUTC, utcToChileLocal } from "@/lib/timezone"
import { es } from "date-fns/locale"
import { sendBookingConfirmation, sendNewBookingAlert } from "@/lib/email"
import { createCalendarEvent } from "@/lib/google-calendar"
import { randomBytes } from "crypto"

const schema = z.object({
  businessId: z.string().cuid(),
  serviceId: z.string().cuid(),
  staffId: z.string().cuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
})

// Simple in-memory rate limit (production: use Redis)
const rateMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const service = await prisma.service.findUnique({
      where: { id: data.serviceId, businessId: data.businessId },
    })
    if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

    const [hours, minutes] = data.time.split(":").map(Number)
    const baseDate = parseISO(data.date)
    // data.time is Chile local — convert to UTC for storage
    const startTime = chileLocalToUTC(setMinutes(setHours(baseDate, hours), minutes))
    const endTime = addMinutes(startTime, service.duration)

    // Resolve staff
    let resolvedStaffId = data.staffId
    if (!resolvedStaffId) {
      const available = await prisma.staffMember.findFirst({
        where: {
          businessId: data.businessId,
          isActive: true,
          deletedAt: null,
          services: { some: { id: data.serviceId } },
          appointments: {
            none: {
              deletedAt: null,
              status: { in: ["PENDING", "CONFIRMED"] },
              OR: [
                { startTime: { lt: endTime }, endTime: { gt: startTime } },
              ],
            },
          },
        },
      })
      if (!available) {
        return NextResponse.json({ error: "No hay disponibilidad para ese horario" }, { status: 409 })
      }
      resolvedStaffId = available.id
    }

    // Find or create client
    let client = await prisma.client.findFirst({
      where: { businessId: data.businessId, email: data.clientEmail, deletedAt: null },
    })
    if (!client) {
      client = await prisma.client.create({
        data: {
          businessId: data.businessId,
          name: data.clientName,
          email: data.clientEmail,
          phone: data.clientPhone,
        },
      })
    }

    const cancelToken = randomBytes(32).toString("hex")

    const appointment = await prisma.appointment.create({
      data: {
        businessId: data.businessId,
        serviceId: data.serviceId,
        staffId: resolvedStaffId,
        clientId: client.id,
        startTime,
        endTime,
        status: "CONFIRMED",
        cancelToken,
      },
    })

    const staff = await prisma.staffMember.findUnique({
      where: { id: resolvedStaffId },
      include: { user: { select: { name: true } } },
    })
    const business = await prisma.business.findUnique({
      where: { id: data.businessId },
      select: { name: true, owner: { select: { name: true, email: true } } },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agendamok.cl"
    const localDate = format(utcToChileLocal(startTime), "EEEE d 'de' MMMM yyyy", { locale: es })
    const localTime = format(utcToChileLocal(startTime), "HH:mm")
    const staffName = staff?.user.name || "Sin asignar"
    const businessName = business?.name || ""

    sendBookingConfirmation({
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      businessName,
      serviceName: service.name,
      staffName,
      date: localDate,
      time: localTime,
      duration: service.duration,
      cancelUrl: `${baseUrl}/cancelar?token=${cancelToken}`,
    }).catch(() => {})

    // Sync to Google Calendar (async, don't block response)
    createCalendarEvent({
      businessId: data.businessId,
      appointmentId: appointment.id,
      summary: `${serviceName} — ${data.clientName}`,
      description: `Cliente: ${data.clientName}\nEmail: ${data.clientEmail}${data.clientPhone ? `\nTel: ${data.clientPhone}` : ""}\nServicio: ${serviceName} (${service.duration} min)`,
      location: business?.address ?? undefined,
      startTime,
      endTime,
    }).catch(() => {})

    if (business?.owner?.email) {
      sendNewBookingAlert({
        ownerEmail: business.owner.email,
        ownerName: business.owner.name || "Hola",
        businessName,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        serviceName: service.name,
        staffName,
        date: localDate,
        time: localTime,
      }).catch(() => {})
    }

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
