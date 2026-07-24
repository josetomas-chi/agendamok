import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; groupId: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, groupId } = await params
  const { clientId, startDate, notes } = await req.json()

  const group = await prisma.schoolGroup.findUnique({
    where: { id: groupId, businessId: id },
    include: { _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
  })
  if (!group) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })
  if (group._count.enrollments >= group.maxCapacity) {
    return NextResponse.json({ error: "El grupo está lleno" }, { status: 400 })
  }

  const existing = await prisma.schoolEnrollment.findUnique({ where: { groupId_clientId: { groupId, clientId } } })
  if (existing) {
    if (existing.status === "ACTIVE") return NextResponse.json({ error: "El alumno ya está inscrito" }, { status: 409 })
    const enrollment = await prisma.schoolEnrollment.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", startDate: startDate ? new Date(startDate) : new Date(), notes: notes || null },
      include: { client: { select: { id: true, name: true, email: true, phone: true, rut: true } } },
    })
    return NextResponse.json({ enrollment })
  }

  const enrollment = await prisma.schoolEnrollment.create({
    data: {
      businessId: id, groupId, clientId,
      startDate: startDate ? new Date(startDate) : new Date(),
      notes: notes || null,
    },
    include: { client: { select: { id: true, name: true, email: true, phone: true, rut: true } } },
  })
  return NextResponse.json({ enrollment }, { status: 201 })
}
