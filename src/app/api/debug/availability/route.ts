import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseISO, addMinutes, setHours, setMinutes, format } from "date-fns"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")
  const serviceId = searchParams.get("serviceId")
  const date = searchParams.get("date") // YYYY-MM-DD
  const staffId = searchParams.get("staffId") ?? undefined

  if (!businessId || !serviceId || !date) {
    return NextResponse.json({ error: "Faltan parámetros: businessId, serviceId, date" }, { status: 400 })
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { duration: true, bufferAfter: true, name: true },
  })
  if (!service) return NextResponse.json({ error: "Servicio no encontrado" })

  const parsedDate = parseISO(date)
  const dayOfWeek = parsedDate.getDay()

  const staffList = staffId
    ? [{ id: staffId }]
    : await prisma.staffMember.findMany({
        where: { businessId, isActive: true, deletedAt: null, services: { some: { id: serviceId } } },
        select: { id: true },
      })

  const staffIds = staffList.map((s: { id: string }) => s.id)

  const schedules = await prisma.workSchedule.findMany({
    where: { staffId: { in: staffIds }, dayOfWeek, isWorking: true },
  })

  const dayStart = new Date(parsedDate); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(parsedDate); dayEnd.setHours(23, 59, 59, 999)

  const existingAppts = await prisma.appointment.findMany({
    where: { staffId: { in: staffIds }, startTime: { gte: dayStart, lte: dayEnd }, status: { in: ["PENDING", "CONFIRMED"] }, deletedAt: null },
    select: { startTime: true, endTime: true, staffId: true },
  })

  const daysOff = await prisma.dayOff.findMany({ where: { staffId: { in: staffIds }, date: dayStart } })
  const offStaffIds = new Set(daysOff.map((d: { staffId: string }) => d.staffId))

  const slotDuration = service.duration + service.bufferAfter
  const slots: string[] = []

  for (const schedule of schedules) {
    if (offStaffIds.has(schedule.staffId)) continue
    const [startH, startM] = schedule.startTime.split(":").map(Number)
    const [endH, endM] = schedule.endTime.split(":").map(Number)
    const scheduleStart = setMinutes(setHours(new Date(parsedDate), startH), startM)
    const scheduleEnd   = setMinutes(setHours(new Date(parsedDate), endH), endM)
    const staffAppts = existingAppts.filter((a: { staffId: string }) => a.staffId === schedule.staffId)
    let cursor = new Date(scheduleStart)
    while (addMinutes(cursor, slotDuration) <= scheduleEnd) {
      const slotEnd = addMinutes(cursor, slotDuration)
      const hasConflict = staffAppts.some((a: { startTime: Date; endTime: Date }) => cursor < new Date(a.endTime) && slotEnd > new Date(a.startTime))
      slots.push(`${format(cursor, "HH:mm")} — conflict=${hasConflict} past=${cursor <= new Date()}`)
      cursor = addMinutes(cursor, 30)
    }
  }

  return NextResponse.json({
    service: service.name,
    date,
    dayOfWeek,
    staffIds,
    schedulesFound: schedules.map((s: { staffId: string; startTime: string; endTime: string; dayOfWeek: number }) => ({ staffId: s.staffId, start: s.startTime, end: s.endTime, dow: s.dayOfWeek })),
    existingAppts: existingAppts.map((a: { staffId: string; startTime: Date; endTime: Date }) => ({ staffId: a.staffId, start: format(new Date(a.startTime), "HH:mm"), end: format(new Date(a.endTime), "HH:mm") })),
    slots,
    nowUTC: new Date().toISOString(),
  })
}
