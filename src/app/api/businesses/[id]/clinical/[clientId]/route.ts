import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, clientId } = await params

  const record = await prisma.clinicalRecord.findUnique({
    where: { clientId },
    include: {
      entries: { orderBy: { createdAt: "desc" } },
      client: { select: { name: true } },
    },
  })

  return NextResponse.json({ record })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, clientId } = await params

  const body = await req.json()
  const { bloodType, allergies, conditions, medications, background, notes, customFields } = body

  const record = await prisma.clinicalRecord.upsert({
    where: { clientId },
    create: { businessId: id, clientId, bloodType, allergies, conditions, medications, background, notes, customFields },
    update: { bloodType, allergies, conditions, medications, background, notes, customFields },
  })

  return NextResponse.json({ record })
}
