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
    console.log("[register] body received:", body.email)
    const { name, email, password } = schema.parse(body)

    console.log("[register] checking existing user...")
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 400 })
    }

    console.log("[register] hashing password...")
    const hashedPassword = await bcrypt.hash(password, 10)

    console.log("[register] creating user...")
    await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "BUSINESS_OWNER" },
    })

    console.log("[register] done!")
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("[register] error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
