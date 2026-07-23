import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; staffId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, staffId } = await params
  const body = await req.json()

  const member = await prisma.staffMember.findFirst({
    where: { id: staffId, businessId: id, deletedAt: null },
  })
  if (!member) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const { image, name, email, phone, color, specialty, bio, commissionType, commissionValue, serviceIds } = body

  const userUpdate: Record<string, unknown> = {}
  if (image !== undefined) userUpdate.image = image
  if (name !== undefined) userUpdate.name = name
  if (email !== undefined) userUpdate.email = email
  if (phone !== undefined) userUpdate.phone = phone
  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({ where: { id: member.userId }, data: userUpdate })
  }

  const staffUpdate: Record<string, unknown> = {}
  if (color !== undefined) staffUpdate.color = color
  if (specialty !== undefined) staffUpdate.specialty = specialty
  if (bio !== undefined) staffUpdate.bio = bio
  if (commissionType !== undefined) staffUpdate.commissionType = commissionType
  if (commissionValue !== undefined) staffUpdate.commissionValue = commissionValue
  if (serviceIds !== undefined) {
    staffUpdate.services = { set: (serviceIds as string[]).map((id: string) => ({ id })) }
  }

  if (Object.keys(staffUpdate).length > 0) {
    await prisma.staffMember.update({ where: { id: staffId }, data: staffUpdate })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, staffId } = await params

  const member = await prisma.staffMember.findFirst({
    where: { id: staffId, businessId: id, deletedAt: null },
  })
  if (!member) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  await prisma.staffMember.update({
    where: { id: staffId },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
