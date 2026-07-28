import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { type, id } = await req.json() as { type: "court" | "appt"; id: string }
  if (!type || !id) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })

  const userId = session.user.id

  // Get all client IDs for this user
  const clients = await prisma.client.findMany({
    where: { userId, deletedAt: null },
    select: { id: true },
  })
  const clientIds = clients.map(c => c.id)

  if (type === "court") {
    const booking = await prisma.courtBooking.findFirst({
      where: { id, clientId: { in: clientIds }, deletedAt: null },
      select: {
        id: true, startTime: true, status: true, paidOnline: true,
        business: { select: { cancellationHoursNotice: true } },
      },
    })
    if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    if (booking.status === "CANCELLED") return NextResponse.json({ error: "Ya cancelada" }, { status: 400 })

    const hoursNotice = booking.business.cancellationHoursNotice ?? 0
    if (hoursNotice > 0) {
      const hoursUntil = (new Date(booking.startTime).getTime() - Date.now()) / 3_600_000
      if (hoursUntil < hoursNotice) {
        return NextResponse.json(
          { error: `Fuera del período de cancelación (se requieren ${hoursNotice}h de anticipación)` },
          { status: 422 }
        )
      }
    }

    await prisma.courtBooking.update({ where: { id }, data: { status: "CANCELLED" } })
    return NextResponse.json({ ok: true })
  }

  if (type === "appt") {
    const appt = await prisma.appointment.findFirst({
      where: { id, clientId: { in: clientIds }, deletedAt: null },
      select: {
        id: true, startTime: true, status: true,
        business: { select: { cancellationHoursNotice: true } },
      },
    })
    if (!appt) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
    if (appt.status === "CANCELLED") return NextResponse.json({ error: "Ya cancelado" }, { status: 400 })

    const hoursNotice = appt.business.cancellationHoursNotice ?? 0
    if (hoursNotice > 0) {
      const hoursUntil = (new Date(appt.startTime).getTime() - Date.now()) / 3_600_000
      if (hoursUntil < hoursNotice) {
        return NextResponse.json(
          { error: `Fuera del período de cancelación (se requieren ${hoursNotice}h de anticipación)` },
          { status: 422 }
        )
      }
    }

    await prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
}
