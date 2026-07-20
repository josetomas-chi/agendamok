import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getAdminBusiness(userId: string) {
  const business = await prisma.business.findUnique({ where: { ownerId: userId } })
  if (business) return business
  const member = await prisma.businessMember.findFirst({
    where: { userId, role: "ADMIN", acceptedAt: { not: null } },
    include: { business: true },
  })
  return member?.business ?? null
}

// PATCH — update member permissions
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const business = await getAdminBusiness(session.user.id)
  if (!business) return NextResponse.json({ error: "No tienes un negocio" }, { status: 400 })

  const { id } = await params
  const { permissions } = await req.json()

  const member = await prisma.businessMember.findFirst({ where: { id, businessId: business.id } })
  if (!member) return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 })

  await prisma.businessMember.update({ where: { id }, data: { permissions } })
  return NextResponse.json({ success: true })
}

// DELETE — remove member
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const business = await getAdminBusiness(session.user.id)
  if (!business) return NextResponse.json({ error: "No tienes un negocio" }, { status: 400 })

  const { id } = await params
  const member = await prisma.businessMember.findFirst({ where: { id, businessId: business.id } })
  if (!member) return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 })

  await prisma.businessMember.delete({ where: { id } })

  const otherMemberships = await prisma.businessMember.count({ where: { userId: member.userId } })
  if (otherMemberships === 0) {
    await prisma.user.update({ where: { id: member.userId }, data: { role: "CLIENT" } })
  }

  return NextResponse.json({ success: true })
}
