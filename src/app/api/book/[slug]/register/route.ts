import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { name, email, password } = await req.json()

  if (!name || !email || !password || password.length < 6) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  // Verify business exists
  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // Email already has an account — not an error, just skip silently
    return NextResponse.json({ success: true, existing: true })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: { name, email, password: hashedPassword, role: "CLIENT" },
  })

  return NextResponse.json({ success: true })
}
