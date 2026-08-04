import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const ADMIN_SECRET = process.env.ADMIN_SECRET

export async function POST(req: Request) {
  const { secret, slug, toEmail, newName, newSlug } = await req.json()
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const business = await prisma.business.findFirst({ where: { slug }, select: { id: true, name: true } })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  const updates: Record<string, unknown> = {}

  if (toEmail) {
    const user = await prisma.user.findUnique({ where: { email: toEmail }, select: { id: true } })
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    updates.ownerId = user.id
  }
  if (newName) updates.name = newName
  if (newSlug) updates.slug = newSlug

  await prisma.business.update({ where: { id: business.id }, data: updates })

  return NextResponse.json({ ok: true, updated: { ...updates, id: business.id } })
}
