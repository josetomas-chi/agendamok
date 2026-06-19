import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendCancellationAlert } from "@/lib/email"
import { utcToChileLocal } from "@/lib/timezone"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken: token },
    include: {
      service: { select: { name: true } },
      client: { select: { name: true } },
      business: { select: { name: true, owner: { select: { name: true, email: true } } } },
    },
  })

  if (!appointment) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
  if (appointment.deletedAt || appointment.status === "CANCELLED") {
    return NextResponse.json({ error: "Este turno ya fue cancelado" }, { status: 409 })
  }
  if (appointment.startTime < new Date()) {
    return NextResponse.json({ error: "No se puede cancelar un turno pasado" }, { status: 409 })
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
  })

  const local = utcToChileLocal(appointment.startTime)
  const date = format(local, "EEEE d 'de' MMMM yyyy", { locale: es })
  const time = format(local, "HH:mm")

  if (appointment.business.owner?.email) {
    sendCancellationAlert({
      ownerEmail: appointment.business.owner.email,
      ownerName: appointment.business.owner.name || "Hola",
      businessName: appointment.business.name,
      clientName: appointment.client.name,
      serviceName: appointment.service.name,
      date,
      time,
    }).catch(() => {})
  }

  return NextResponse.json({
    ok: true,
    businessName: appointment.business.name,
    serviceName: appointment.service.name,
    startTime: appointment.startTime,
  })
}
