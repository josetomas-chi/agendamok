import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const ADMIN_SECRET = process.env.ADMIN_SECRET

export async function POST(req: Request) {
  const { secret, slug, toEmail } = await req.json()
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: toEmail }, select: { id: true } })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const business = await prisma.business.findFirst({ where: { slug }, select: { id: true, name: true } })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  await prisma.business.update({ where: { id: business.id }, data: { ownerId: user.id } })

  return NextResponse.json({ ok: true, business: business.name, newOwner: toEmail })
}
