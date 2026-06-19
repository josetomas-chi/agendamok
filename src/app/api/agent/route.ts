import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { parseISO, addMinutes, setHours, setMinutes, format } from "date-fns"
import { es } from "date-fns/locale"
import { sendBookingConfirmation } from "@/lib/email"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const tools: Anthropic.Tool[] = [
  {
    name: "get_services",
    description: "Obtiene la lista de servicios disponibles del negocio con sus precios y duración.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string", description: "ID del negocio" },
      },
      required: ["businessId"],
    },
  },
  {
    name: "get_staff",
    description: "Obtiene la lista de profesionales del negocio.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string", description: "ID del negocio" },
        serviceId: { type: "string", description: "Filtrar solo staff que ofrece este servicio (opcional)" },
      },
      required: ["businessId"],
    },
  },
  {
    name: "get_availability",
    description: "Obtiene los horarios disponibles para un servicio en una fecha específica.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string" },
        serviceId: { type: "string" },
        date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        staffId: { type: "string", description: "ID del profesional (opcional)" },
      },
      required: ["businessId", "serviceId", "date"],
    },
  },
  {
    name: "book_appointment",
    description: "Crea un turno confirmado para el cliente.",
    input_schema: {
      type: "object" as const,
      properties: {
        businessId: { type: "string" },
        serviceId: { type: "string" },
        staffId: { type: "string", description: "ID del profesional (puede ser null para asignar automáticamente)" },
        date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        time: { type: "string", description: "Hora en formato HH:mm" },
        clientName: { type: "string" },
        clientEmail: { type: "string" },
        clientPhone: { type: "string", description: "Teléfono opcional" },
      },
      required: ["businessId", "serviceId", "date", "time", "clientName", "clientEmail"],
    },
  },
]

async function runTool(name: string, input: Record<string, string>): Promise<string> {
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
      const service = await prisma.service.findUnique({
        where: { id: input.serviceId },
        select: { duration: true, bufferAfter: true },
      })
      if (!service) return JSON.stringify({ slots: [] })

      const date = parseISO(input.date)
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

      if (staffIds.length === 0) return JSON.stringify({ slots: [] })

      const schedules = await prisma.workSchedule.findMany({
        where: { staffId: { in: staffIds }, dayOfWeek, isWorking: true },
      })

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
        const scheduleStart = setMinutes(setHours(new Date(date), startH), startM)
        const scheduleEnd = setMinutes(setHours(new Date(date), endH), endM)
        const staffAppts = existingAppts.filter((a: { staffId: string }) => a.staffId === schedule.staffId)
        let cursor = new Date(scheduleStart)
        while (addMinutes(cursor, slotDuration) <= scheduleEnd) {
          const slotEnd = addMinutes(cursor, slotDuration)
          const hasConflict = staffAppts.some((appt: { startTime: Date; endTime: Date }) => cursor < new Date(appt.endTime) && slotEnd > new Date(appt.startTime))
          if (!hasConflict && cursor > new Date()) availableSlots.add(format(cursor, "HH:mm"))
          cursor = addMinutes(cursor, 30)
        }
      }

      return JSON.stringify({ slots: Array.from(availableSlots).sort() })
    }

    if (name === "book_appointment") {
      const service = await prisma.service.findUnique({ where: { id: input.serviceId, businessId: input.businessId } })
      if (!service) return JSON.stringify({ error: "Servicio no encontrado" })

      const [hours, minutes] = input.time.split(":").map(Number)
      const startTime = setMinutes(setHours(parseISO(input.date), hours), minutes)
      const endTime = addMinutes(startTime, service.duration)

      let resolvedStaffId = input.staffId || null
      if (!resolvedStaffId) {
        const available = await prisma.staffMember.findFirst({
          where: {
            businessId: input.businessId, isActive: true, deletedAt: null,
            services: { some: { id: input.serviceId } },
            appointments: { none: { deletedAt: null, status: { in: ["PENDING", "CONFIRMED"] }, OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }] } },
          },
        })
        if (!available) return JSON.stringify({ error: "No hay disponibilidad para ese horario" })
        resolvedStaffId = available.id
      }

      let client = await prisma.client.findFirst({ where: { businessId: input.businessId, email: input.clientEmail, deletedAt: null } })
      if (!client) {
        client = await prisma.client.create({ data: { businessId: input.businessId, name: input.clientName, email: input.clientEmail, phone: input.clientPhone } })
      }

      const appointment = await prisma.appointment.create({
        data: { businessId: input.businessId, serviceId: input.serviceId, staffId: resolvedStaffId, clientId: client.id, startTime, endTime, status: "CONFIRMED" },
      })

      const staff = await prisma.staffMember.findUnique({ where: { id: resolvedStaffId }, include: { user: { select: { name: true } } } })
      const business = await prisma.business.findUnique({ where: { id: input.businessId }, select: { name: true } })

      sendBookingConfirmation({
        clientName: input.clientName, clientEmail: input.clientEmail,
        businessName: business?.name || "", serviceName: service.name,
        staffName: staff?.user.name || "Sin asignar",
        date: format(startTime, "EEEE d 'de' MMMM yyyy", { locale: es }),
        time: format(startTime, "HH:mm"), duration: service.duration,
      }).catch(() => {})

      return JSON.stringify({ success: true, appointmentId: appointment.id, date: format(startTime, "EEEE d 'de' MMMM", { locale: es }), time: input.time, staffName: staff?.user.name })
    }

    return JSON.stringify({ error: "Tool desconocida" })
  } catch {
    return JSON.stringify({ error: "Error ejecutando la herramienta" })
  }
}

export async function POST(req: Request) {
  const { messages, businessId, businessName } = await req.json()

  if (!businessId || !messages?.length) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })
  }

  const today = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" })

  const systemPrompt = `Eres el asistente de reservas de ${businessName}. Hoy es ${today}.

REGLAS CRÍTICAS — nunca las violes:
- JAMÁS menciones un horario o fecha disponible sin haber llamado primero a get_availability y obtenido slots reales.
- Si get_availability devuelve slots vacíos [], esa fecha NO tiene disponibilidad. Díselo al cliente y pregunta otra fecha.
- Solo ofrece horarios que aparezcan literalmente en el array de slots devuelto por get_availability.
- Nunca inventes, asumas ni sugiereas horarios de memoria.

Flujo correcto:
1. Saluda y pregunta qué servicio necesita
2. Llama get_services y muestra las opciones reales
3. El cliente elige servicio → pregunta qué fecha prefiere
4. Llama get_availability con esa fecha → si hay slots, muéstralos (máx 5); si no hay, di que está completo y pregunta otra fecha
5. El cliente elige horario → pide nombre y email (teléfono opcional)
6. Llama book_appointment con los datos
7. Confirma la reserva con todos los detalles

Sé breve y conversacional. No muestres IDs técnicos. Usa siempre businessId: ${businessId}.
Si el cliente no especifica profesional, no pidas uno — el sistema asigna automáticamente.`

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))

  let response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages: anthropicMessages,
  })

  // Agentic loop — ejecuta tools hasta obtener texto final
  while (response.stop_reason === "tool_use") {
    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (tu) => ({
        type: "tool_result" as const,
        tool_use_id: tu.id,
        content: await runTool(tu.name, tu.input as Record<string, string>),
      }))
    )

    anthropicMessages.push({ role: "assistant", content: response.content })
    anthropicMessages.push({ role: "user", content: toolResults })

    response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: anthropicMessages,
    })
  }

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? ""
  return NextResponse.json({ reply: text })
}
