import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { parseISO, addMinutes, setHours, setMinutes, format, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { chileLocalToUTC, utcToChileLocal } from "@/lib/timezone"
import { sendBookingConfirmation, sendCourtBookingConfirmation } from "@/lib/email"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Session expires after 30 minutes of inactivity
const SESSION_TTL_MS = 30 * 60 * 1000

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationMessage = { role: "user" | "assistant"; content: string }

// ─── Tool definitions (same as web agent) ────────────────────────────────────

const serviceTools: Anthropic.Tool[] = [
  {
    name: "get_services",
    description: "Obtiene la lista de servicios disponibles del negocio.",
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
    input_schema: {
      type: "object" as const,
      properties: { businessId: { type: "string" }, serviceId: { type: "string" }, date: { type: "string" }, staffId: { type: "string" } },
      required: ["businessId", "serviceId", "date"],
    },
  },
  {
    name: "book_appointment",
    description: "Crea un turno confirmado para el cliente.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string" }, serviceId: { type: "string" }, staffId: { type: "string" },
        date: { type: "string" }, time: { type: "string" }, clientName: { type: "string" },
        clientEmail: { type: "string" }, clientPhone: { type: "string" },
      },
      required: ["businessId", "serviceId", "date", "time", "clientName", "clientEmail"],
    },
  },
]

const courtTools: Anthropic.Tool[] = [
  {
    name: "get_courts",
    description: "Obtiene las canchas disponibles del club.",
    input_schema: { type: "object" as const, properties: { businessId: { type: "string" } }, required: ["businessId"] },
  },
  {
    name: "get_court_availability",
    description: "Obtiene los horarios disponibles para canchas en una fecha.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string" }, date: { type: "string" },
        sport: { type: "string" }, duration: { type: "number" },
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
        businessId: { type: "string" }, courtId: { type: "string" }, date: { type: "string" },
        time: { type: "string" }, duration: { type: "number" }, price: { type: "number" },
        clientName: { type: "string" }, clientEmail: { type: "string" }, clientPhone: { type: "string" },
      },
      required: ["businessId", "courtId", "date", "time", "duration", "clientName", "clientEmail"],
    },
  },
]

// ─── Tool runners (adapted from web agent) ───────────────────────────────────

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
        where, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } },
      })
      return JSON.stringify(staff.map((s: { id: string; specialty: string | null; user: { name: string } }) => ({ id: s.id, name: s.user.name, specialty: s.specialty })))
    }

    if (name === "get_availability") {
      const service = await prisma.service.findUnique({ where: { id: input.serviceId }, select: { duration: true, bufferAfter: true } })
      if (!service) return JSON.stringify({ slots: [], error: "Servicio no encontrado" })

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
      const staffIds = input.staffId
        ? [input.staffId]
        : (await prisma.staffMember.findMany({ where: { businessId: input.businessId, isActive: true, deletedAt: null, services: { some: { id: input.serviceId } } }, select: { id: true } })).map((s: { id: string }) => s.id)

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

      return JSON.stringify({ slots: Array.from(availableSlots).sort() })
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
      if (!client) client = await prisma.client.create({ data: { businessId: input.businessId, name: input.clientName, email: input.clientEmail, phone: input.clientPhone || null } })

      const appointment = await prisma.appointment.create({
        data: { businessId: input.businessId, serviceId: input.serviceId, staffId: resolvedStaffId, clientId: client.id, startTime, endTime, status: "CONFIRMED" },
      })

      const staff = await prisma.staffMember.findUnique({ where: { id: resolvedStaffId! }, include: { user: { select: { name: true } } } })
      const business = await prisma.business.findUnique({ where: { id: input.businessId }, select: { name: true } })

      sendBookingConfirmation({
        clientName: input.clientName, clientEmail: input.clientEmail, businessName: business?.name || "",
        serviceName: service.name, staffName: staff?.user.name || "Sin asignar",
        date: format(utcToChileLocal(startTime), "EEEE d 'de' MMMM yyyy", { locale: es }),
        time: format(utcToChileLocal(startTime), "HH:mm"), duration: service.duration,
        startTimeISO: startTime.toISOString(),
      }).catch(() => {})

      return JSON.stringify({ success: true, appointmentId: appointment.id, time: input.time, staffName: staff?.user.name })
    }

    return JSON.stringify({ error: "Tool desconocida" })
  } catch {
    return JSON.stringify({ error: "Error ejecutando la herramienta" })
  }
}

async function runCourtTool(name: string, input: Record<string, string | number>): Promise<string> {
  try {
    if (name === "get_courts") {
      const courts = await prisma.court.findMany({
        where: { businessId: String(input.businessId), isActive: true },
        select: { id: true, name: true, sport: true, description: true, pricingRules: { select: { days: true, startTime: true, endTime: true, price: true, fixedSlots: true } } },
        orderBy: { sortOrder: "asc" },
      })
      const hasFixedSlots = courts.some(c => c.pricingRules.some(r => r.fixedSlots && r.fixedSlots.length > 0))
      const fixedDurations: number[] = []
      if (hasFixedSlots) {
        courts.forEach(c => c.pricingRules.forEach(r => {
          if (r.fixedSlots && r.fixedSlots.length >= 2) {
            const [h1, m1] = r.fixedSlots[0].split(":").map(Number)
            const [h2, m2] = r.fixedSlots[1].split(":").map(Number)
            const dur = (h2 * 60 + m2) - (h1 * 60 + m1)
            if (dur > 0 && !fixedDurations.includes(dur)) fixedDurations.push(dur)
          }
        }))
      }
      return JSON.stringify({
        courts: courts.map(c => ({ id: c.id, name: c.name, sport: c.sport, description: c.description, pricing: c.pricingRules.map(r => ({ days: r.days, from: r.startTime, to: r.endTime, price: r.price })) })),
        hasFixedSlots, fixedDurations,
      })
    }

    if (name === "get_court_availability") {
      const dateStr = String(input.date)
      const duration = Number(input.duration || 60)
      const sport = input.sport ? String(input.sport) : undefined

      const courts = await prisma.court.findMany({
        where: { businessId: String(input.businessId), isActive: true, ...(sport ? { sport } : {}) },
        select: { id: true, name: true, sport: true, pricingRules: { select: { days: true, startTime: true, endTime: true, price: true, fixedSlots: true } } },
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
        function isBooked(start: Date, end: Date) { return courtBookings.some(b => start < new Date(b.endTime) && end > new Date(b.startTime)) }

        const fixedRules = rulesForDay.filter(r => r.fixedSlots && r.fixedSlots.length > 0)
        const flexRules = rulesForDay.filter(r => !r.fixedSlots || r.fixedSlots.length === 0)
        const slots: { time: string; price: number }[] = []

        for (const rule of fixedRules) {
          const [h1, m1] = rule.fixedSlots[0].split(":").map(Number)
          const [h2, m2] = rule.fixedSlots[1]?.split(":").map(Number) ?? [h1 + 1, m1]
          const ruleDuration = (h2 * 60 + m2) - (h1 * 60 + m1)
          for (const slotTime of rule.fixedSlots) {
            const [sh, sm] = slotTime.split(":").map(Number)
            const start = new Date(dayStart); start.setHours(sh, sm, 0, 0)
            const end = addMinutes(start, ruleDuration)
            if (chileLocalToUTC(start) > now && !isBooked(start, end)) slots.push({ time: slotTime, price: Number(rule.price) })
          }
        }

        if (flexRules.length > 0) {
          const flexOpen = Math.min(...flexRules.map(r => timeToMinutes(r.startTime)))
          const flexClose = Math.max(...flexRules.map(r => timeToMinutes(r.endTime)))
          let cursor = new Date(dayStart)
          cursor.setHours(Math.floor(flexOpen / 60), flexOpen % 60, 0, 0)
          const cutoff = new Date(dayStart); cutoff.setHours(Math.floor(flexClose / 60), flexClose % 60, 0, 0)
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

        return { courtId: court.id, courtName: court.name, sport: court.sport, slots }
      }).filter(c => c.slots.length > 0)

      return JSON.stringify(result)
    }

    if (name === "book_court") {
      const court = await prisma.court.findUnique({ where: { id: String(input.courtId) } })
      if (!court) return JSON.stringify({ error: "Cancha no encontrada" })

      const [hours, minutes] = String(input.time).split(":").map(Number)
      const startTime = chileLocalToUTC(setMinutes(setHours(parseISO(String(input.date)), hours), minutes))
      const endTime = addMinutes(startTime, Number(input.duration))

      let client = await prisma.client.findFirst({ where: { businessId: String(input.businessId), email: String(input.clientEmail), deletedAt: null } })
      if (!client) client = await prisma.client.create({ data: { businessId: String(input.businessId), name: String(input.clientName), email: String(input.clientEmail), phone: input.clientPhone ? String(input.clientPhone) : null } })

      const booking = await prisma.courtBooking.create({
        data: { businessId: String(input.businessId), courtId: String(input.courtId), clientId: client.id, startTime, endTime, duration: Number(input.duration), totalPrice: Number(input.price || 0), status: "CONFIRMED" },
      })

      const business = await prisma.business.findUnique({ where: { id: String(input.businessId) }, select: { name: true } })
      sendCourtBookingConfirmation({
        clientName: String(input.clientName), clientEmail: String(input.clientEmail), businessName: business?.name || "",
        courtName: court.name, sport: court.sport || "",
        date: format(utcToChileLocal(startTime), "EEEE d 'de' MMMM yyyy", { locale: es }),
        time: format(utcToChileLocal(startTime), "HH:mm"), duration: Number(input.duration), totalPrice: Number(input.price || 0),
        startTimeISO: startTime.toISOString(),
      }).catch(() => {})

      return JSON.stringify({ success: true, bookingId: booking.id, time: input.time })
    }

    return JSON.stringify({ error: "Tool desconocida" })
  } catch {
    return JSON.stringify({ error: "Error ejecutando la herramienta" })
  }
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(business: { id: string; name: string; businessType: string }, phone: string): string {
  const nowChile = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }))
  const today = format(nowChile, "EEEE d 'de' MMMM yyyy", { locale: es })
  const isSports = business.businessType === "SPORTS_CLUB"

  if (isSports) {
    return `Eres el asistente virtual de *${business.name}* atendiendo por WhatsApp.
Hoy es ${today}. El businessId es "${business.id}".
El cliente está escribiendo desde el número ${phone} — úsalo como teléfono si es necesario.

Tu misión: ayudar a reservar canchas de forma rápida y clara. Sé amigable, directo y usa lenguaje natural de chat.
Escribe en español chileno informal. Usa emojis con moderación.

REGLAS:
• NUNCA uses tablas Markdown ni símbolos | ni guiones como separadores de tabla
• Muestra disponibilidad con viñetas: • Cancha — HH:mm — $precio
• NO preguntes la duración si hay bloques fijos — úsalos directamente
• Confirma siempre nombre, email y horario antes de reservar
• Si el cliente ya reservó antes y da su email, reconócelo como cliente existente`
  }

  return `Eres el asistente virtual de *${business.name}* atendiendo por WhatsApp.
Hoy es ${today}. El businessId es "${business.id}".
El cliente está escribiendo desde el número ${phone} — úsalo como teléfono si es necesario.

Tu misión: ayudar a agendar turnos de forma rápida y clara. Sé amigable, directo y usa lenguaje natural de chat.
Escribe en español chileno informal. Usa emojis con moderación.

REGLAS:
• NUNCA uses tablas Markdown ni símbolos | ni guiones como separadores de tabla
• NO preguntes la duración — cada servicio ya tiene la suya definida
• Muestra disponibilidad con viñetas: • HH:mm — Profesional (si aplica)
• Confirma siempre nombre, email y horario antes de reservar
• Si el cliente ya reservó antes y da su email, reconócelo como cliente existente`
}

// ─── Main webhook handler ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const from = params.get("From") || ""          // "whatsapp:+56912345678"
    const msgBody = (params.get("Body") || "").trim()
    const toNumber = params.get("To") || ""        // "whatsapp:+17373094339"

    if (!from || !msgBody) return new Response("", { status: 200 })

    // Strip "whatsapp:" prefix
    const phone = from.replace("whatsapp:", "")

    // Find which business this Twilio number belongs to (by matching slug or just getting all whatsappBot-enabled)
    // For now: find business by matching the To number or simply get all enabled ones and match by phone prefix
    // Since all businesses share one Twilio number, we route by business slug in the To field or
    // use a custom header. The recommended Twilio approach: one number per business or use subaccounts.
    // For MVP: the client must message a number that maps to exactly one business.
    // We store the Twilio number in TWILIO_WHATSAPP_FROM env, so there's one shared number.
    // Route by looking up any active WhatsApp session for this phone first, then fall back to
    // finding whatsappBotEnabled businesses. If multiple, require client to specify (future).

    // Normalize the Twilio "To" number to match stored format (e.g. "+17373094339")
    const toNormalized = toNumber.replace("whatsapp:", "")

    // Find the business that owns this Twilio number
    const ownerBusiness = await prisma.business.findFirst({
      where: { twilioWhatsappNumber: toNormalized, whatsappBotEnabled: true, isActive: true, deletedAt: null },
      select: { id: true, name: true, businessType: true },
    })

    if (!ownerBusiness) return new Response("", { status: 200 })

    let sessionMessages: ConversationMessage[] = []
    const business = ownerBusiness

    // Look for existing session for this phone + business
    const existingSession = await prisma.whatsAppSession.findUnique({
      where: { businessId_phone: { businessId: business.id, phone } },
    })

    if (existingSession) {
      const age = Date.now() - new Date(existingSession.updatedAt).getTime()
      if (age < SESSION_TTL_MS) {
        sessionMessages = (existingSession.messages as ConversationMessage[]) || []
      }
      // If expired, start fresh (sessionMessages stays [])
    }

    // Append user message
    sessionMessages.push({ role: "user", content: msgBody })

    // Trim history to last 20 messages to keep context manageable
    if (sessionMessages.length > 20) sessionMessages = sessionMessages.slice(-20)

    const isSports = business.businessType === "SPORTS_CLUB"
    const tools = isSports ? courtTools : serviceTools
    const runner = isSports ? runCourtTool : runServiceTool

    // Agentic loop
    const messages: Anthropic.MessageParam[] = sessionMessages.map(m => ({ role: m.role, content: m.content }))
    let assistantText = ""

    for (let i = 0; i < 6; i++) {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: buildSystemPrompt(business, phone),
        tools,
        messages,
      })

      const textBlocks = response.content.filter(b => b.type === "text").map(b => (b as Anthropic.TextBlock).text).join("")
      const toolUses = response.content.filter(b => b.type === "tool_use") as Anthropic.ToolUseBlock[]

      if (response.stop_reason === "end_turn" || toolUses.length === 0) {
        assistantText = textBlocks
        break
      }

      // Execute tools
      messages.push({ role: "assistant", content: response.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tool of toolUses) {
        const result = await runner(tool.name, tool.input as Record<string, string & number>)
        toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result })
      }
      messages.push({ role: "user", content: toolResults })

      if (textBlocks) assistantText = textBlocks
    }

    if (!assistantText) return new Response("", { status: 200 })

    // Append assistant reply to session
    sessionMessages.push({ role: "assistant", content: assistantText })

    // Persist session
    await prisma.whatsAppSession.upsert({
      where: { businessId_phone: { businessId: business.id, phone } },
      update: { messages: sessionMessages, updatedAt: new Date() },
      create: { businessId: business.id, phone, messages: sessionMessages },
    })

    // Send reply via Twilio
    await sendWhatsAppMessage(phone, assistantText)

    return new Response("", { status: 200 })
  } catch (err) {
    console.error("[whatsapp/incoming]", err)
    return new Response("", { status: 200 }) // Always 200 to Twilio
  }
}
