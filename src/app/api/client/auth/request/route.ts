import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendClientOtp } from "@/lib/email"
import { addMinutes } from "date-fns"

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Invalidate old codes
  await prisma.clientOtp.updateMany({
    where: { email: normalizedEmail, used: false },
    data: { used: true },
  })

  const code = generateCode()
  await prisma.clientOtp.create({
    data: {
      email: normalizedEmail,
      code,
      expiresAt: addMinutes(new Date(), 10),
    },
  })

  await sendClientOtp({ email: normalizedEmail, code })

  return NextResponse.json({ ok: true })
}
