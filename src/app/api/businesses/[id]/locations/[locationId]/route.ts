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
      address: body.address !== undefined ? (body.address || null) : undefined,
      city: body.city !== undefined ? (body.city || null) : undefined,
      country: body.country !== undefined ? (body.country || null) : undefined,
      phone: body.phone !== undefined ? (body.phone || null) : undefined,
      timezone: body.timezone || undefined,
      isActive: body.isActive !== undefined ? body.isActive : undefined,
      isDefault: body.isDefault !== undefined ? body.isDefault : undefined,
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
