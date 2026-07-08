import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

type Holiday = { surchargeType: string | null; surchargeValue: number | null; type: string }

// Calcula precio para una sesión aplicando reglas de tarifa y recargo de feriado
async function calcPrice(
  businessId: string,
  courtId: string,
  start: Date,
  end: Date,
  holiday: Holiday | null,
): Promise<number> {
  void businessId
  const court = await prisma.court.findUnique({ where: { id: courtId }, include: { pricingRules: true } })
  if (!court) return 0

  const dayOfWeek = start.getUTCDay()
  const timeStr = `${String(start.getUTCHours()).padStart(2, "0")}:${String(start.getUTCMinutes()).padStart(2, "0")}`
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  const rule = court.pricingRules.find(
    (r: { days: number[]; startTime: string; endTime: string; price: unknown }) =>
      r.days.includes(dayOfWeek) && timeStr >= r.startTime && timeStr < r.endTime,
  )
  let price = rule ? Number(rule.price) * durationHours : 0

  if (holiday?.surchargeValue) {
    if (holiday.surchargeType === "PERCENT") price = price * (1 + holiday.surchargeValue / 100)
    else if (holiday.surchargeType === "FIXED") price = price + holiday.surchargeValue
  }

  return price
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { courtId, clientId, dayOfWeek, startHour, startMinute, durationMinutes, rangeStart, rangeEnd, notes } =
    await req.json()

  if (!courtId || dayOfWeek === undefined || startHour === undefined || !rangeStart || !rangeEnd) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const rangeStartDate = new Date(rangeStart)
  const rangeEndDate = new Date(rangeEnd)

  if (rangeEndDate <= rangeStartDate) {
    return NextResponse.json({ error: "La fecha de término debe ser posterior a la de inicio" }, { status: 400 })
  }

  // Cargar todos los feriados del rango de una vez
  const holidays = await prisma.clubHoliday.findMany({
    where: {
      businessId: id,
      date: { gte: rangeStartDate, lte: rangeEndDate },
    },
  })

  type HolidayRow = Holiday & { date: Date }
  const holidayMap = new Map<string, HolidayRow>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (holidays as any[]).map((h: HolidayRow) => [h.date.toISOString().slice(0, 10), h]),
  )

  // Generar todas las fechas que caen en el día de la semana indicado
  const sessions: { start: Date; end: Date; price: number }[] = []
  const skipped: string[] = []
  const conflicts: string[] = []

  const cursor = new Date(rangeStartDate)
  // Avanzar hasta el primer día de la semana correcto
  while (cursor.getUTCDay() !== dayOfWeek) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  while (cursor <= rangeEndDate) {
    const dateKey = cursor.toISOString().slice(0, 10)
    const holiday = holidayMap.get(dateKey) ?? null

    if (holiday?.type === "CLOSED") {
      skipped.push(dateKey)
      cursor.setUTCDate(cursor.getUTCDate() + 7)
      continue
    }

    const start = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), startHour, startMinute, 0),
    )
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

    // Validar solapamiento
    const conflict = await prisma.courtBooking.findFirst({
      where: {
        courtId,
        deletedAt: null,
        status: { not: "CANCELLED" },
        OR: [
          { startTime: { gte: start, lt: end } },
          { endTime: { gt: start, lte: end } },
          { startTime: { lte: start }, endTime: { gte: end } },
        ],
      },
    })

    if (conflict) {
      conflicts.push(dateKey)
      cursor.setUTCDate(cursor.getUTCDate() + 7)
      continue
    }

    const price = await calcPrice(id, courtId, start, end, holiday)
    sessions.push({ start, end, price })
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  if (sessions.length === 0) {
    return NextResponse.json(
      { error: "No se pudieron crear sesiones — todas las fechas tienen conflictos o el negocio está cerrado", skipped, conflicts },
      { status: 409 },
    )
  }

  // Crear grupo y todas las sesiones en una transacción
  const group = await prisma.$transaction(async (tx: typeof prisma) => {
    const g = await tx.recurringBookingGroup.create({
      data: {
        businessId: id,
        courtId,
        clientId: clientId || null,
        dayOfWeek,
        startHour,
        startMinute,
        durationMinutes,
        rangeStart: rangeStartDate,
        rangeEnd: rangeEndDate,
        notes: notes || null,
      },
    })

    await tx.courtBooking.createMany({
      data: sessions.map((s) => ({
        businessId: id,
        courtId,
        clientId: clientId || null,
        recurringGroupId: g.id,
        startTime: s.start,
        endTime: s.end,
        price: s.price,
        notes: notes || null,
        status: "CONFIRMED",
      })),
    })

    return g
  })

  return NextResponse.json(
    { groupId: group.id, created: sessions.length, skipped, conflicts },
    { status: 201 },
  )
}
