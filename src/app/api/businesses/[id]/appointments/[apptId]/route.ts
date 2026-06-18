import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addMinutes } from "date-fns"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; apptId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, apptId } = await params

  const body = await req.json()

  // If rescheduling (startTime provided), recalculate endTime from service duration
  if (body.startTime) {
    const existing = await prisma.appointment.findFirst({
      where: { id: apptId, businessId: id, deletedAt: null },
      include: { service: { select: { duration: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })

    const startTime = new Date(body.startTime)
    body.endTime = addMinutes(startTime, existing.service.duration)
    body.startTime = startTime
  }

  const appointment = await prisma.appointment.update({
    where: { id: apptId },
    data: body,
    include: {
      service: { select: { name: true, color: true } },
      staff: { include: { user: { select: { name: true } } } },
      client: { select: { name: true, email: true, phone: true } },
    },
  })
  return NextResponse.json({ appointment })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; apptId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { apptId } = await params

  await prisma.appointment.update({ where: { id: apptId }, data: { deletedAt: new Date(), status: "CANCELLED" } })
  return NextResponse.json({ success: true })
}
