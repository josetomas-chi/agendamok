import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { addMinutes } from "date-fns"

const patchSchema = z.object({
  startTime: z.string(), // ISO string
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; appointmentId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, appointmentId } = await params

  try {
    const body = await req.json()
    const { startTime: startTimeISO } = patchSchema.parse(body)

    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId: id, deletedAt: null },
      include: { service: { select: { duration: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })

    const startTime = new Date(startTimeISO)
    const endTime = addMinutes(startTime, existing.service.duration)

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { startTime, endTime },
      include: {
        service: { select: { name: true, color: true } },
        staff: { include: { user: { select: { name: true } } } },
        client: { select: { name: true, email: true, phone: true } },
      },
    })

    return NextResponse.json({ appointment })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
