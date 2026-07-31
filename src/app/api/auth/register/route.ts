import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })

    const hashedPassword = await bcrypt.hash(password, 10)

    if (existing) {
      // Allow setting password if account was auto-created (e.g. access request) but never activated
      if (existing.password) {
        return NextResponse.json({ error: "Este email ya está registrado" }, { status: 400 })
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: { name, password: hashedPassword, role: "BUSINESS_OWNER" },
      })
    } else {
      await prisma.user.create({
        data: { name, email, password: hashedPassword, role: "BUSINESS_OWNER" },
      })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
