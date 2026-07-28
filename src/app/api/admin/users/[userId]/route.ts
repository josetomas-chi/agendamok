import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

type Params = { params: Promise<{ userId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  const { userId } = await params
  const { resetPassword } = await req.json()

  if (resetPassword) {
    const tempPassword = crypto.randomBytes(5).toString("hex") // e.g. "a3f9c1b2d4"
    const hashed = await bcrypt.hash(tempPassword, 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
    return NextResponse.json({ tempPassword })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  const { userId } = await params

  // Prevent deleting yourself
  if (userId === (session.user as { id: string }).id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 })
  }

  // Block deletion if user owns a business (would leave it orphaned)
  const ownedBusiness = await prisma.business.findFirst({
    where: { ownerId: userId },
    select: { name: true },
  })
  if (ownedBusiness) {
    return NextResponse.json({
      error: `No se puede eliminar — el usuario es dueño del negocio "${ownedBusiness.name}". Transfiere el negocio primero.`
    }, { status: 400 })
  }

  try {
    await prisma.$transaction([
      // Deslinkar client records (userId nullable)
      prisma.client.updateMany({ where: { userId }, data: { userId: null } }),
      // Eliminar membresías de negocio
      prisma.businessMember.deleteMany({ where: { userId } }),
      // Eliminar staff profile (cascada a horarios y días libres via schema)
      prisma.staffMember.deleteMany({ where: { userId } }),
      // Eliminar el usuario (cascada a accounts y sessions via schema)
      prisma.user.delete({ where: { id: userId } }),
    ])
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Error deleting user:", e)
    return NextResponse.json({ error: "No se puede eliminar — tiene datos asociados que impiden la eliminación" }, { status: 400 })
  }
}
