import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, clientId } = await params

  const { notes, customFields, appointmentId, staffName } = await req.json()
  if (!notes?.trim()) return NextResponse.json({ error: "Las notas son requeridas" }, { status: 400 })

  // Ensure record exists
  const record = await prisma.clinicalRecord.upsert({
    where: { clientId },
    create: { businessId: id, clientId },
    update: {},
  })

  const entry = await prisma.clinicalEntry.create({
    data: {
      clinicalRecordId: record.id,
      notes,
      customFields,
      appointmentId: appointmentId || null,
      staffName: staffName || null,
    },
  })

  return NextResponse.json({ entry }, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { entryId } = await req.json()
  await prisma.clinicalEntry.delete({ where: { id: entryId } })
  return NextResponse.json({ ok: true })
}
