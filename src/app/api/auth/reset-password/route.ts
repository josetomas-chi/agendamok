import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const { token, password } = await req.json()
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 10)

  // Upsert user with new password
  await prisma.user.upsert({
    where: { email: record.email },
    update: { password: hash },
    create: { email: record.email, password: hash },
  })

  // Consume the token
  await prisma.passwordResetToken.delete({ where: { token } })

  return NextResponse.json({ success: true })
}
