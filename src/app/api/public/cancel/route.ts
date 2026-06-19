import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

  const appointment = await prisma.appointment.findUnique({
    where: { cancelToken: token },
    include: {
      service: { select: { name: true } },
      business: { select: { name: true } },
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

  return NextResponse.json({
    ok: true,
    businessName: appointment.business.name,
    serviceName: appointment.service.name,
    startTime: appointment.startTime,
  })
}
