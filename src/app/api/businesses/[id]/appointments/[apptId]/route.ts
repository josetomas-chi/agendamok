import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; apptId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { apptId } = await params

  const body = await req.json()
  const appointment = await prisma.appointment.update({
    where: { id: apptId },
    data: body,
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
