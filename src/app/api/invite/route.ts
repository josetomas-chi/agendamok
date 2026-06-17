import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  let payload: { userId: string; type: string }
  try {
    payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as { userId: string; type: string }
  } catch {
    return NextResponse.json({ error: "El link de invitación es inválido o expiró" }, { status: 400 })
  }

  if (payload.type !== "invite") {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  if (user.password) return NextResponse.json({ error: "Este link ya fue utilizado" }, { status: 409 })

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
