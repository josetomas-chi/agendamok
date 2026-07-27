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

  await prisma.user.delete({ where: { id: userId } })
  return NextResponse.json({ success: true })
}
