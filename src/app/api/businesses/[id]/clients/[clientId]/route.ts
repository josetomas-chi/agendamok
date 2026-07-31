import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, clientId } = await params
  const business = await prisma.business.findFirst({ where: { id, ownerId: session.user.id } })
  if (!business) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const body = await req.json()
  const allowed = ["name", "lastName", "rut", "email", "phone", "gender", "role", "notes", "tags", "creditBalance", "loyaltyPoints", "segment", "allowTransfer"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }
  // Sanitize numeric fields — must be non-negative integers
  if ("loyaltyPoints" in data) data.loyaltyPoints = Math.max(0, Math.round(Number(data.loyaltyPoints) || 0))
  if ("creditBalance" in data) data.creditBalance = Math.max(0, Math.round(Number(data.creditBalance) || 0))

  if (data.rut) {
    const conflict = await prisma.client.findFirst({
      where: { businessId: id, rut: data.rut as string, NOT: { id: clientId } },
    })
    if (conflict) return NextResponse.json({ error: "Ya existe un cliente con ese RUT" }, { status: 409 })
  }

  if (data.email && typeof data.email === "string") {
    const emailConflict = await prisma.client.findFirst({
      where: { businessId: id, email: { equals: data.email, mode: "insensitive" }, deletedAt: null, NOT: { id: clientId } },
      select: { id: true },
    })
    if (emailConflict) return NextResponse.json({ error: "Ya existe un cliente con ese email" }, { status: 409 })
  }

  // Auto-link to user account if email is being set and matches a registered user
  if (data.email && typeof data.email === "string") {
    const existing = await prisma.client.findUnique({ where: { id: clientId }, select: { userId: true } })
    if (!existing?.userId) {
      const matchedUser = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } })
      if (matchedUser) data.userId = matchedUser.id
    }
  }

  const client = await prisma.client.update({ where: { id: clientId, businessId: id }, data })
  return NextResponse.json({ client })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, clientId } = await params
  const business = await prisma.business.findFirst({ where: { id, ownerId: session.user.id } })
  if (!business) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  await prisma.client.update({ where: { id: clientId, businessId: id }, data: { deletedAt: new Date() } })
  return NextResponse.json({ success: true })
}
