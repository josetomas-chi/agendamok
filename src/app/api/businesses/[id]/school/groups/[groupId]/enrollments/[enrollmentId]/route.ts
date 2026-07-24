import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; groupId: string; enrollmentId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { enrollmentId } = await params
  const { status, notes } = await req.json()
  const enrollment = await prisma.schoolEnrollment.update({
    where: { id: enrollmentId },
    data: { ...(status !== undefined && { status }), ...(notes !== undefined && { notes }) },
    include: { client: { select: { id: true, name: true, email: true, phone: true, rut: true } } },
  })
  return NextResponse.json({ enrollment })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { enrollmentId } = await params
  await prisma.schoolEnrollment.delete({ where: { id: enrollmentId } })
  return NextResponse.json({ ok: true })
}
