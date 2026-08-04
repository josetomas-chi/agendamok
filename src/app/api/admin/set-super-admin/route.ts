import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret")
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  await prisma.user.update({ where: { email }, data: { role: "SUPER_ADMIN" } })

  return NextResponse.json({ ok: true, email: user.email, previousRole: user.role, newRole: "SUPER_ADMIN" })
}

export async function GET(req: Request) {
  const secret = req.headers.get("x-admin-secret")
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const url = new URL(req.url)
  const email = url.searchParams.get("email")
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  return NextResponse.json({ email: user.email, role: user.role })
}
