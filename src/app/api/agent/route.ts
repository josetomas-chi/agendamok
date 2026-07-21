import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { parseISO, addMinutes, setHours, setMinutes, format, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { sendBookingConfirmation, sendCourtBookingConfirmation } from "@/lib/email"
import { chileLocalToUTC, utcToChileLocal } from "@/lib/timezone"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Tools: negocios de servicios ────────────────────────────────────────────

const serviceTools: Anthropic.Tool[] = [
  {
    name: "get_services",
    description: "Obtiene la lista de servicios disponibles del negocio con sus precios y duración.",
    input_schema: { type: "object" as const, properties: { businessId: { type: "string" } }, required: ["businessId"] },
  },
  {
    name: "get_staff",
    description: "Obtiene la lista de profesionales del negocio.",
    input_schema: { type: "object" as const, properties: { businessId: { type: "string" }, serviceId: { type: "string" } }, required: ["businessId"] },
  },
  {
    name: "get_availability",
    description: "Obtiene los horarios disponibles para un servicio en una fecha específica.",
    input_schema: { type: "object" as const, properties: { businessId: { type: "string" }, serviceId: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" }, staffId: { type: "string" } }, required: ["businessId", "serviceId", "date"] },
  },
  {
    name: "book_appointment",
    description: "Crea un turno confirmado para el cliente.",
    input_schema: { type: "object" as const, properties: { businessId: { type: "string" }, serviceId: { type: "string" }, staffId: { type: "string" }, date: { type: "string" }, time: { type: "string" }, clientName: { type: "string" }, clientEmail: { type: "string" }, clientPhone: { type: "string" } }, required: ["businessId", "serviceId", "date", "time", "clientName", "clientEmail"] },
  },
]

// ─── Tools: clubs deportivos ──────────────────────────────────────────────────

const courtTools: Anthropic.Tool[] = [
  {
    name: "get_courts",
    description: "Obtiene las canchas disponibles del club con sus deportes y precios.",
    input_schema: { type: "object" as const, properties: { businessId: { type: "string" } }, required: ["businessId"] },
  },
  {
    name: "get_court_availability",
    description: "Obtiene los horarios disponibles para canchas en una fecha, opcionalmente filtrando por deporte y duración.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        sport: { type: "string", description: "Deporte a filtrar (ej: Pádel, Tenis). Opcional." },
        duration: { type: "number", description: "Duración en minutos (ej: 60, 90). Opcional, default 60." },
      },
      required: ["businessId", "date"],
    },
  },
  {
    name: "book_court",
    description: "Reserva una cancha para el cliente.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string" },
        courtId: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:mm" },
        duration: { type: "number", description: "Duración en minutos" },
        price: { type: "number", description: "Precio del slot" },
        clientName: { type: "string" },
        clientEmail: { type: "string" },
        clientPhone: { type: "string" },
      },
      required: ["businessId", "courtId", "date", "time", "duration", "clientName", "clientEmail"],
    },
  },
]

// ─── Tool runner: servicios ───────────────────────────────────────────────────

async function runServiceTool(name: string, input: Record<string, string>): Promise<string> {
  try {
    if (name === "get_services") {
      const services = await prisma.service.findMany({
        where: { businessId: input.businessId, isActive: true, deletedAt: null },
        select: { id: true, name: true, duration: true, price: true, category: true },
        orderBy: { name: "asc" },
      })
      return JSON.stringify(services)
    }

    if (name === "get_staff") {
      const where: Record<string, unknown> = { businessId: input.businessId, isActive: true, deletedAt: null }
      if (input.serviceId) where.services = { some: { id: input.serviceId } }
      const staff = await prisma.staffMember.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { user: { name: "asc" } },
      })
      return JSON.stringify(staff.map((s: { id: string; specialty: string | null; user: { name: string } }) => ({ id: s.id, name: s.user.name, specialty: s.specialty })))
    }

    if (name === "get_availability") {
      const service = await prisma.service.findUnique({ where: { id: input.serviceId }, select: { duration: true, bufferAfter: true } })
      if (!service) return JSON.stringify({ slots: [], error: `Servicio ${input.serviceId} no encontrado` })

      let dateStr = input.date
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const dayNum = parseInt(dateStr.replace(/\D/g, ""))
        if (dayNum) {
          const nowChile = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }))
          for (let i = 0; i < 30; i++) {
            const d = new Date(nowChile); d.setDate(nowChile.getDate() + i)
            if (d.getDate() === dayNum) {
              dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
              break
            }
          }
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return JSON.stringify({ slots: [], error: `Fecha inválida: "${input.date}"` })
      }

      const date = parseISO(dateStr)
      const dayOfWeek = date.getDay()

      let staffIds: string[]
      if (input.staffId) {
        staffIds = [input.staffId]
      } else {
        const staffList = await prisma.staffMember.findMany({
          where: { businessId: input.businessId, isActive: true, deletedAt: null, services: { some: { id: input.serviceId } } },
          select: { id: true },
        })
        staffIds = staffList.map((s: { id: string }) => s.id)
      }

      if (staffIds.length === 0) return JSON.stringify({ slots: [], debug: "No hay profesionales para este servicio" })

      const schedules = await prisma.workSchedule.findMany({ where: { staffId: { in: staffIds }, dayOfWeek, isWorking: true } })
      if (schedules.length === 0) return JSON.stringify({ slots: [], debug: "Sin horario para ese día" })

      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)
      const existingAppts = await prisma.appointment.findMany({
        where: { staffId: { in: staffIds }, startTime: { gte: dayStart, lte: dayEnd }, status: { in: ["PENDING", "CONFIRMED"] }, deletedAt: null },
        select: { startTime: true, endTime: true, staffId: true },
      })
      const daysOff = await prisma.dayOff.findMany({ where: { staffId: { in: staffIds }, date: dayStart } })
      const offStaffIds = new Set(daysOff.map((d: { staffId: string }) => d.staffId))

      const slotDuration = service.duration + service.bufferAfter
      const availableSlots = new Set<string>()

      for (const schedule of schedules) {
        if (offStaffIds.has(schedule.staffId)) continue
        const [startH, startM] = schedule.startTime.split(":").map(Number)
        const [endH, endM] = schedule.endTime.split(":").map(Number)
        const scheduleStart = chileLocalToUTC(setMinutes(setHours(new Date(date), startH), startM))
        const scheduleEnd = chileLocalToUTC(setMinutes(setHours(new Date(date), endH), endM))
        const staffAppts = existingAppts.filter((a: { staffId: string }) => a.staffId === schedule.staffId)
        let cursor = new Date(scheduleStart)
        while (addMinutes(cursor, slotDuration) <= scheduleEnd) {
          const slotEnd = addMinutes(cursor, slotDuration)
          const hasConflict = staffAppts.some((appt: { startTime: Date; endTime: Date }) => cursor < new Date(appt.endTime) && slotEnd > new Date(appt.startTime))
          if (!hasConflict && cursor > new Date()) availableSlots.add(format(utcToChileLocal(cursor), "HH:mm"))
          cursor = addMinutes(cursor, 30)
        }
      }

      return JSON.stringify({ slots: Array.from(availableSlots).sort(), _count: availableSlots.size })
    }

    if (name === "book_appointment") {
      const service = await prisma.service.findUnique({ where: { id: input.serviceId, businessId: input.businessId } })
      if (!service) return JSON.stringify({ error: "Servicio no encontrado" })

      const [hours, minutes] = input.time.split(":").map(Number)
      const startTime = chileLocalToUTC(setMinutes(setHours(parseISO(input.date), hours), minutes))
      const endTime = addMinutes(startTime, service.duration)

      let resolvedStaffId = input.staffId || null
      if (!resolvedStaffId) {
        const available = await prisma.staffMember.findFirst({
          where: { businessId: input.businessId, isActive: true, deletedAt: null, services: { some: { id: input.serviceId } }, appointments: { none: { deletedAt: null, status: { in: ["PENDING", "CONFIRMED"] }, OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }] } } },
        })
        if (!available) return JSON.stringify({ error: "No hay disponibilidad para ese horario" })
        resolvedStaffId = available.id
      }

      let client = await prisma.client.findFirst({ where: { businessId: input.businessId, email: input.clientEmail, deletedAt: null } })
      if (!client) client = await prisma.client.create({ data: { businessId: input.businessId, name: input.clientName, email: input.clientEmail, phone: input.clientPhone } })

      const appointment = await prisma.appointment.create({
        data: { businessId: input.businessId, serviceId: input.serviceId, staffId: resolvedStaffId, clientId: client.id, startTime, endTime, status: "CONFIRMED" },
      })

      const staff = await prisma.staffMember.findUnique({ where: { id: resolvedStaffId }, include: { user: { select: { name: true } } } })
      const business = await prisma.business.findUnique({ where: { id: input.businessId }, select: { name: true } })

      sendBookingConfirmation({
        clientName: input.clientName, clientEmail: input.clientEmail, businessName: business?.name || "",
        serviceName: service.name, staffName: staff?.user.name || "Sin asignar",
        date: format(utcToChileLocal(startTime), "EEEE d 'de' MMMM yyyy", { locale: es }),
        time: format(utcToChileLocal(startTime), "HH:mm"), duration: service.duration,
        startTimeISO: startTime.toISOString(),
      }).catch(() => {})

      return JSON.stringify({ success: true, appointmentId: appointment.id, date: format(startTime, "EEEE d 'de' MMMM", { locale: es }), time: input.time, staffName: staff?.user.name })
    }

    return JSON.stringify({ error: "Tool desconocida" })
  } catch {
    return JSON.stringify({ error: "Error ejecutando la herramienta" })
  }
}

// ─── Tool runner: canchas ─────────────────────────────────────────────────────

async function runCourtTool(name: string, input: Record<string, string | number>): Promise<string> {
  try {
    if (name === "get_courts") {
      const courts = await prisma.court.findMany({
        where: { businessId: String(input.businessId), isActive: true },
        select: { id: true, name: true, sport: true, description: true, pricingRules: { select: { days: true, startTime: true, endTime: true, price: true } } },
        orderBy: { sortOrder: "asc" },
      })
      return JSON.stringify(courts.map(c => ({
        id: c.id, name: c.name, sport: c.sport,
        description: c.description,
        pricing: c.pricingRules.map(r => ({ days: r.days, from: r.startTime, to: r.endTime, price: r.price })),
      })))
    }

    if (name === "get_court_availability") {
      const dateStr = String(input.date)
      const duration = Number(input.duration || 60)
      const sport = input.sport ? String(input.sport) : undefined

      const courts = await prisma.court.findMany({
        where: { businessId: String(input.businessId), isActive: true, ...(sport ? { sport } : {}) },
        select: {
          id: true, name: true, sport: true, color: true,
          pricingRules: { select: { days: true, startTime: true, endTime: true, price: true, fixedSlots: true, paymentPlayers: true } },
        },
        orderBy: { sortOrder: "asc" },
      })

      const day = parseISO(dateStr)
      const dayOfWeek = day.getDay()
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      const now = new Date()

      const bookings = await prisma.courtBooking.findMany({
        where: { businessId: String(input.businessId), courtId: { in: courts.map(c => c.id) }, startTime: { gte: dayStart, lte: dayEnd }, status: { notIn: ["CANCELLED"] }, deletedAt: null },
        select: { courtId: true, startTime: true, endTime: true },
      })

      function timeToMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m }

      const result = courts.map(court => {
        const rulesForDay = court.pricingRules.filter(r => r.days.includes(dayOfWeek))
        const courtBookings = bookings.filter(b => b.courtId === court.id)

        function isBooked(start: Date, end: Date) {
          return courtBookings.some(b => start < new Date(b.endTime) && end > new Date(b.startTime))
        }

        const fixedRules = rulesForDay.filter(r => r.fixedSlots && r.fixedSlots.length > 0)
        const flexRules = rulesForDay.filter(r => !r.fixedSlots || r.fixedSlots.length === 0)
        const slots: { time: string; price: number }[] = []

        for (const rule of fixedRules) {
          const [h1, m1] = rule.fixedSlots[0].split(":").map(Number)
          const [h2, m2] = rule.fixedSlots[1]?.split(":").map(Number) ?? [h1 + 1, m1]
          const ruleDuration = (h2 * 60 + m2) - (h1 * 60 + m1)
          if (duration !== 0 && ruleDuration !== duration) continue
          for (const slotTime of rule.fixedSlots) {
            const [sh, sm] = slotTime.split(":").map(Number)
            const start = new Date(dayStart); start.setHours(sh, sm, 0, 0)
            const end = addMinutes(start, ruleDuration)
            const startUTC = chileLocalToUTC(start)
            if (startUTC > now && !isBooked(start, end)) slots.push({ time: slotTime, price: Number(rule.price) })
          }
        }

        if (flexRules.length > 0) {
          const flexOpen = Math.min(...flexRules.map(r => timeToMinutes(r.startTime)))
          const flexClose = Math.max(...flexRules.map(r => timeToMinutes(r.endTime)))
          let cursor = new Date(dayStart)
          cursor.setHours(Math.floor(flexOpen / 60), flexOpen % 60, 0, 0)
          const cutoff = new Date(dayStart)
          cutoff.setHours(Math.floor(flexClose / 60), flexClose % 60, 0, 0)
          while (cursor < cutoff) {
            const slotEnd = addMinutes(cursor, duration)
            if (slotEnd > cutoff) break
            if (chileLocalToUTC(cursor) > now && !isBooked(cursor, slotEnd)) {
              const cm = cursor.getHours() * 60 + cursor.getMinutes()
              const rule = flexRules.find(r => cm >= timeToMinutes(r.startTime) && cm < timeToMinutes(r.endTime))
              slots.push({ time: format(cursor, "HH:mm"), price: rule ? Number(rule.price) : 0 })
            }
            cursor = addMinutes(cursor, 30)
          }
        }

        slots.sort((a, b) => a.time.localeCompare(b.time))
        return { id: court.id, name: court.name, sport: court.sport, slots }
      }).filter(c => c.slots.length > 0)

      return JSON.stringify({ courts: result, date: dateStr, duration })
    }

    if (name === "book_court") {
      const { businessId, courtId, date, time, duration, price, clientName, clientEmail, clientPhone } = input as Record<string, string>

      const startTime = parseISO(`${date}T${time}`)
      const endTime = addMinutes(startTime, Number(duration || 60))

      const conflict = await prisma.courtBooking.findFirst({
        where: { courtId, status: { notIn: ["CANCELLED"] }, deletedAt: null, OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }] },
      })
      if (conflict) return JSON.stringify({ error: "Ese horario ya no está disponible. Por favor elige otro." })

      let client = await prisma.client.findFirst({ where: { businessId, email: clientEmail } })
      if (!client) client = await prisma.client.create({ data: { businessId, name: clientName, email: clientEmail, phone: clientPhone || null } })

      const court = await prisma.court.findUnique({ where: { id: courtId }, select: { name: true, sponsorName: true, sponsorLogo: true, sponsorUrl: true } })
      const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } })

      const booking = await prisma.courtBooking.create({
        data: { businessId, courtId, clientId: client.id, startTime, endTime, price: Number(price || 0), status: "CONFIRMED" },
      })

      sendCourtBookingConfirmation({
        clientName, clientEmail, businessName: business?.name ?? "",
        courtName: court?.name ?? courtId,
        startTime: startTime.toISOString(), endTime: endTime.toISOString(),
        price: Number(price || 0),
        sponsorName: court?.sponsorName ?? undefined,
        sponsorLogo: court?.sponsorLogo ?? undefined,
        sponsorUrl: court?.sponsorUrl ?? undefined,
      }).catch(() => {})

      return JSON.stringify({ success: true, bookingId: booking.id, court: court?.name, date, time, duration })
    }

    return JSON.stringify({ error: "Tool desconocida" })
  } catch {
    return JSON.stringify({ error: "Error ejecutando la herramienta" })
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { messages, businessId, businessName } = await req.json()

  if (!businessId || !messages?.length) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })
  }

  // Detectar tipo de negocio
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { businessType: true } })
  const isSports = business?.businessType === "SPORTS_CLUB"

  const nowChile = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }))
  const today = nowChile.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const todayISO = `${nowChile.getFullYear()}-${String(nowChile.getMonth()+1).padStart(2,"0")}-${String(nowChile.getDate()).padStart(2,"0")}`

  const DAYS_ES = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]
  const upcomingDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(nowChile); d.setDate(nowChile.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
    return `${DAYS_ES[d.getDay()]} ${d.getDate()} → ${iso}`
  }).join("\n")

  const tools = isSports ? courtTools : serviceTools

  const systemPrompt = isSports
    ? `Eres el asistente de reservas de canchas de ${businessName}. Hoy es ${today} (${todayISO}).

CALENDARIO — próximos 14 días (usa SIEMPRE estas fechas al llamar get_court_availability):
${upcomingDays}

REGLAS:
1. Empieza llamando get_courts para conocer las canchas y deportes disponibles.
2. Cuando el cliente mencione deporte y fecha, llama get_court_availability DE INMEDIATO.
3. Muestra las canchas con horarios disponibles y su precio. Máximo 4 slots por cancha.
4. Si el cliente elige un slot, pide nombre y email para confirmar.
5. Llama book_court con los datos exactos del slot elegido (courtId, date, time, duration, price).
6. Confirma la reserva con los detalles.

Sé breve y directo. No muestres IDs. businessId siempre: ${businessId}.`
    : `Eres el asistente de reservas de ${businessName}. Hoy es ${today} (${todayISO}).

CALENDARIO — próximos 14 días (usa SIEMPRE estas fechas exactas al llamar get_availability):
${upcomingDays}

REGLAS:
1. Saluda → llama get_services → muestra opciones.
2. Cliente elige servicio → pregunta fecha.
3. Cliente menciona fecha → llama get_availability DE INMEDIATO.
4. Muestra los slots disponibles (máx 6). Si slots=[], di que está completo y pregunta otra fecha.
5. Cliente elige horario → pide nombre + email.
6. Llama book_appointment → confirma la reserva.

Sé breve. No muestres IDs. businessId siempre: ${businessId}.
No pidas profesional — el sistema asigna automáticamente.`

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages: anthropicMessages,
  })

  while (response.stop_reason === "tool_use") {
    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (tu) => {
        const result = isSports
          ? await runCourtTool(tu.name, tu.input as Record<string, string | number>)
          : await runServiceTool(tu.name, tu.input as Record<string, string>)
        return { type: "tool_result" as const, tool_use_id: tu.id, content: result }
      })
    )

    anthropicMessages.push({ role: "assistant", content: response.content })
    anthropicMessages.push({ role: "user", content: toolResults })

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: anthropicMessages,
    })
  }

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? ""
  return NextResponse.json({ reply: text })
}
