import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; groupId: string }> }

// PATCH: actualiza hora de inicio/fin de todas las sesiones futuras del grupo
// Recibe startHour, startMinute, durationMinutes — recalcula precio de cada sesión
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, groupId } = await params
  const { startHour, startMinute, durationMinutes, fromBookingId } = await req.json()

  if (startHour === undefined || startMinute === undefined || durationMinutes === undefined) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
  }

  // Obtener fecha de referencia (desde esta sesión en adelante)
  const fromBooking = fromBookingId
    ? await prisma.courtBooking.findUnique({ where: { id: fromBookingId }, select: { startTime: true } })
    : null
  const fromDate = fromBooking ? fromBooking.startTime : new Date()

  // Sesiones futuras del grupo
  const future = await prisma.courtBooking.findMany({
    where: {
      recurringGroupId: groupId,
      businessId: id,
      deletedAt: null,
      status: { not: "CANCELLED" },
      startTime: { gte: fromDate },
    },
    include: { court: { include: { pricingRules: true } } },
  })

  // Actualizar cada una con los nuevos horarios y precio recalculado
  await Promise.all(future.map(async (b: typeof future[0]) => {
    const d = new Date(b.startTime)
    const newStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), startHour, startMinute, 0))
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000)

    // Validar solapamiento (excluyendo la propia sesión)
    const conflict = await prisma.courtBooking.findFirst({
      where: {
        courtId: b.courtId, deletedAt: null, status: { not: "CANCELLED" }, id: { not: b.id },
        OR: [
          { startTime: { gte: newStart, lt: newEnd } },
          { endTime: { gt: newStart, lte: newEnd } },
          { startTime: { lte: newStart }, endTime: { gte: newEnd } },
        ],
      },
    })
    if (conflict) return // silenciosamente omite las que tienen conflicto

    // Recalcular precio
    const dayOfWeek = newStart.getUTCDay()
    const timeStr = `${String(newStart.getUTCHours()).padStart(2, "0")}:${String(newStart.getUTCMinutes()).padStart(2, "0")}`
    const durationHours = durationMinutes / 60
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rule = (b.court as any).pricingRules?.find((r: { days: number[]; startTime: string; endTime: string; price: unknown }) =>
      r.days.includes(dayOfWeek) && timeStr >= r.startTime && timeStr < r.endTime
    )
    const price = rule ? Number(rule.price) * durationHours : Number(b.price)

    await prisma.courtBooking.update({
      where: { id: b.id },
      data: { startTime: newStart, endTime: newEnd, price },
    })
  }))

  // Actualizar grupo con nueva hora/duración
  await prisma.recurringBookingGroup.update({
    where: { id: groupId },
    data: { startHour, startMinute, durationMinutes },
  })

  return NextResponse.json({ updated: future.length })
}
