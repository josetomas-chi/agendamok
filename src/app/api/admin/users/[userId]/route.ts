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

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  const { userId } = await params
  const permanent = new URL(req.url).searchParams.get("permanent") === "true"

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
    if (permanent) {
      // Borrado permanente: libera el email para reutilizarlo, pero borra también
      // los turnos del staff (bloqueados por FK restrict) — pierde el historial.
      const staffMembers = await prisma.staffMember.findMany({ where: { userId }, select: { id: true } })
      const staffIds = staffMembers.map((s: { id: string }) => s.id)

      await prisma.$transaction([
        ...(staffIds.length
          ? [prisma.appointment.deleteMany({ where: { staffId: { in: staffIds } } })]
          : []),
        prisma.client.updateMany({ where: { userId }, data: { userId: null } }),
        prisma.businessMember.deleteMany({ where: { userId } }),
        prisma.staffMember.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ])
    } else {
      const now = new Date()
      await prisma.$transaction([
        // Deslinkar client records (userId nullable)
        prisma.client.updateMany({ where: { userId }, data: { userId: null } }),
        // Eliminar membresías de negocio (no afecta historial de turnos)
        prisma.businessMember.deleteMany({ where: { userId } }),
        // Soft-delete del perfil de staff: preserva turnos e historial de comisiones,
        // solo lo oculta de listados activos (mismo patrón que /api/businesses/[id]/staff/[staffId])
        prisma.staffMember.updateMany({ where: { userId, deletedAt: null }, data: { deletedAt: now, isActive: false } }),
        // Invalidar sesiones activas
        prisma.session.deleteMany({ where: { userId } }),
        // Soft-delete del usuario: bloquea login (ver auth.ts) y lo saca del listado de /api/admin/users
        prisma.user.update({ where: { id: userId }, data: { deletedAt: now } }),
      ])
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Error deleting user:", e)
    return NextResponse.json({ error: "No se puede eliminar — tiene datos asociados que impiden la eliminación" }, { status: 400 })
  }
}
