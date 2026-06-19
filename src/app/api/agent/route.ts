import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { parseISO, addMinutes, setHours, setMinutes, format } from "date-fns"
import { es } from "date-fns/locale"
import { sendBookingConfirmation } from "@/lib/email"
import { chileLocalToUTC, utcToChileLocal } from "@/lib/timezone"

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

      if (staffIds.length === 0) return JSON.stringify({ slots: [], debug: `No hay profesionales con servicio ${input.serviceId} en negocio ${input.businessId}` })

      const schedules = await prisma.workSchedule.findMany({
        where: { staffId: { in: staffIds }, dayOfWeek, isWorking: true },
      })

      if (schedules.length === 0) return JSON.stringify({ slots: [], debug: `Sin horario para dayOfWeek=${dayOfWeek} (0=Dom,1=Lun,2=Mar,3=Mié,4=Jue,5=Vie,6=Sáb). staffIds encontrados: ${staffIds.join(",")}. Schedules en DB: ${JSON.stringify(await prisma.workSchedule.findMany({ where: { staffId: { in: staffIds } }, select: { dayOfWeek: true, isWorking: true, staffId: true } }))}` })

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
        // Schedule times are Chile local — convert to UTC for DB comparisons
        const scheduleStart = chileLocalToUTC(setMinutes(setHours(new Date(date), startH), startM))
        const scheduleEnd   = chileLocalToUTC(setMinutes(setHours(new Date(date), endH), endM))
        const staffAppts = existingAppts.filter((a: { staffId: string }) => a.staffId === schedule.staffId)
        let cursor = new Date(scheduleStart)
        while (addMinutes(cursor, slotDuration) <= scheduleEnd) {
          const slotEnd = addMinutes(cursor, slotDuration)
          const hasConflict = staffAppts.some((appt: { startTime: Date; endTime: Date }) => cursor < new Date(appt.endTime) && slotEnd > new Date(appt.startTime))
          if (!hasConflict && cursor > new Date()) {
            availableSlots.add(format(utcToChileLocal(cursor), "HH:mm"))
          }
          cursor = addMinutes(cursor, 30)
        }
      }

      const sortedSlots = Array.from(availableSlots).sort()
      console.log(`[availability] date=${input.date} serviceId=${input.serviceId} staffIds=${JSON.stringify(staffIds)} slots=${JSON.stringify(sortedSlots)}`)
      return JSON.stringify({ slots: sortedSlots, _count: sortedSlots.length })
    }

    if (name === "book_appointment") {
      const service = await prisma.service.findUnique({ where: { id: input.serviceId, businessId: input.businessId } })
      if (!service) return JSON.stringify({ error: "Servicio no encontrado" })

      const [hours, minutes] = input.time.split(":").map(Number)
      // input.time is Chile local — convert to UTC for storage
      const startTime = chileLocalToUTC(setMinutes(setHours(parseISO(input.date), hours), minutes))
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

  const nowChile = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }))
  const today = nowChile.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const todayISO = `${nowChile.getFullYear()}-${String(nowChile.getMonth()+1).padStart(2,"0")}-${String(nowChile.getDate()).padStart(2,"0")}`

  // Pre-calculate next 14 days with weekday names so the model doesn't have to infer dates
  const DAYS_ES = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]
  const upcomingDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(nowChile)
    d.setDate(nowChile.getDate() + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
    return `${DAYS_ES[d.getDay()]} ${d.getDate()} → ${iso}`
  }).join("\n")

  const systemPrompt = `Eres el asistente de reservas de ${businessName}. Hoy es ${today} (${todayISO}).

CALENDARIO — próximos 14 días (usa SIEMPRE estas fechas exactas al llamar get_availability):
${upcomingDays}

REGLAS — sígelas en orden estricto:

REGLA 1 — NUNCA digas si hay o no hay disponibilidad sin haber llamado get_availability primero.
REGLA 2 — En cuanto el cliente mencione o confirme una fecha, llama get_availability DE INMEDIATO. No hagas preguntas adicionales antes.
REGLA 3 — Usa SIEMPRE las fechas del CALENDARIO de arriba. No calcules fechas por tu cuenta.
REGLA 4 — Solo muestra slots que get_availability haya devuelto literalmente. Si el campo "slots" del resultado tiene elementos, DEBES mostrarlos — nunca digas "no hay disponibilidad" si slots no está vacío. Si slots=[], di que no hay disponibilidad ese día y pregunta otra fecha.
REGLA 5 — Nunca sugieras otros días sin haberlos consultado con get_availability. Si el cliente pregunta qué días hay disponibilidad, consulta varios días uno por uno.

Flujo:
1. Saluda → get_services → muestra opciones
2. Cliente elige servicio → pregunta fecha
3. Cliente menciona fecha → INMEDIATAMENTE llama get_availability (sin pedir confirmación de la fecha)
4. Muestra los slots disponibles (máx 6) o di que está completo
5. Cliente elige horario → pide nombre + email
6. Llama book_appointment → confirma la reserva

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

  // Agentic loop — ejecuta tools hasta obtener texto final
  while (response.stop_reason === "tool_use") {
    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (tu) => {
        const result = await runTool(tu.name, tu.input as Record<string, string>)
        console.log(`[agent] tool=${tu.name} input=${JSON.stringify(tu.input)} result=${result}`)
        return { type: "tool_result" as const, tool_use_id: tu.id, content: result }
      })
    )

    anthropicMessages.push({ role: "assistant", content: response.content })
    anthropicMessages.push({ role: "user", content: toolResults })

    // If the last tool call was get_services, force another tool call (must be get_availability)
    // This prevents the model from responding with text before checking availability
    const calledGetServices = toolUses.some(tu => tu.name === "get_services")
    const calledGetAvailability = toolUses.some(tu => tu.name === "get_availability")
    const toolChoice = (calledGetServices && !calledGetAvailability)
      ? { type: "any" as const }
      : { type: "auto" as const }

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      tool_choice: toolChoice,
      messages: anthropicMessages,
    })
  }

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? ""
  return NextResponse.json({ reply: text })
}
