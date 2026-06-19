import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addDays } from "date-fns"

export async function POST(req: Request) {
  const { email, code } = await req.json()
  if (!email || !code) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })

  const normalizedEmail = email.toLowerCase().trim()

  const otp = await prisma.clientOtp.findFirst({
    where: {
      email: normalizedEmail,
      code: code.trim(),
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  })

  if (!otp) return NextResponse.json({ error: "Código incorrecto o expirado" }, { status: 401 })

  await prisma.clientOtp.update({ where: { id: otp.id }, data: { used: true } })

  const session = await prisma.clientSession.create({
    data: {
      email: normalizedEmail,
      expiresAt: addDays(new Date(), 30),
    },
  })

  const res = NextResponse.json({ ok: true, email: normalizedEmail })
  res.cookies.set("client-session", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: session.expiresAt,
    path: "/",
  })
  return res
}
