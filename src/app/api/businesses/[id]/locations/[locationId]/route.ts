import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; locationId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { locationId } = await params

  const body = await req.json()
  const location = await prisma.location.update({
    where: { id: locationId },
    data: {
      name: body.name,
      address: body.address || null,
      city: body.city || null,
      phone: body.phone || null,
      timezone: body.timezone,
      isActive: body.isActive,
    },
  })

  return NextResponse.json({ location })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; locationId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { locationId } = await params

  await prisma.location.update({
    where: { id: locationId },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
