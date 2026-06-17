import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { format, parseISO, addMinutes, setHours, setMinutes } from "date-fns"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")
  const serviceId = searchParams.get("serviceId")
  const dateStr = searchParams.get("date")
  const staffId = searchParams.get("staffId") || null

  if (!businessId || !serviceId || !dateStr) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { duration: true, bufferAfter: true },
  })
  if (!service) return NextResponse.json({ slots: [] })

  const date = parseISO(dateStr)
  const dayOfWeek = date.getDay()

  // Get eligible staff
  let staffIds: string[]
  if (staffId) {
    staffIds = [staffId]
  } else {
    const staffWithService = await prisma.staffMember.findMany({
      where: {
        businessId,
        isActive: true,
        deletedAt: null,
        services: { some: { id: serviceId } },
      },
      select: { id: true },
    })
    staffIds = staffWithService.map((s: { id: string }) => s.id)
  }

  if (staffIds.length === 0) return NextResponse.json({ slots: [] })

  // Get schedules for that day
  const schedules = await prisma.workSchedule.findMany({
    where: { staffId: { in: staffIds }, dayOfWeek, isWorking: true },
  })

  // Get existing appointments for that day
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const existingAppts = await prisma.appointment.findMany({
    where: {
      staffId: { in: staffIds },
      startTime: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
      deletedAt: null,
    },
    select: { startTime: true, endTime: true, staffId: true },
  })

  // Check days off
  const daysOff = await prisma.dayOff.findMany({
    where: { staffId: { in: staffIds }, date: dayStart },
  })
  const offStaffIds = new Set(daysOff.map((d: { staffId: string }) => d.staffId))

  const slotDuration = service.duration + service.bufferAfter
  const availableSlots = new Set<string>()

  for (const schedule of schedules) {
    if (offStaffIds.has(schedule.staffId)) continue

    const [startH, startM] = schedule.startTime.split(":").map(Number)
    const [endH, endM] = schedule.endTime.split(":").map(Number)

    const scheduleStart = setMinutes(setHours(new Date(date), startH), startM)
    const scheduleEnd = setMinutes(setHours(new Date(date), endH), endM)

    const staffAppts = existingAppts.filter((a: { staffId: string; startTime: Date; endTime: Date }) => a.staffId === schedule.staffId)

    let cursor = new Date(scheduleStart)
    while (addMinutes(cursor, slotDuration) <= scheduleEnd) {
      const slotEnd = addMinutes(cursor, slotDuration)

      // Check overlap with existing appointments
      const hasConflict = staffAppts.some((appt: { startTime: Date; endTime: Date }) => {
        const apptStart = new Date(appt.startTime)
        const apptEnd = new Date(appt.endTime)
        return cursor < apptEnd && slotEnd > apptStart
      })

      // Skip past slots
      const now = new Date()
      const isInPast = cursor <= now

      if (!hasConflict && !isInPast) {
        availableSlots.add(format(cursor, "HH:mm"))
      }

      cursor = addMinutes(cursor, 30) // 30-min intervals
    }
  }

  const sorted = Array.from(availableSlots).sort()
  return NextResponse.json({ slots: sorted })
}
