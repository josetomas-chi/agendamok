import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const staffMember = await prisma.staffMember.findUnique({ where: { userId: session.user.id } })
  if (!staffMember) return NextResponse.json({ error: "No eres staff" }, { status: 403 })

  const { status } = await req.json()
  if (!["COMPLETED", "NO_SHOW"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: id, staffId: staffMember.id, deletedAt: null },
  })
  if (!appointment) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })

  const updated = await prisma.appointment.update({
    where: { id: id },
    data: { status },
  })

  return NextResponse.json(updated)
}
