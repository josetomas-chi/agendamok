import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendPasswordReset } from "@/lib/email"
import { addHours } from "date-fns"

export async function POST(_: Request, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, clientId } = await params

  const business = await prisma.business.findUnique({ where: { id, ownerId: session.user.id } })
  if (!business) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true, email: true } })
  if (!client?.email) return NextResponse.json({ error: "El cliente no tiene email registrado" }, { status: 400 })

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email: client.email } })

  const token = await prisma.passwordResetToken.create({
    data: { email: client.email, expiresAt: addHours(new Date(), 1) },
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.cl"
  await sendPasswordReset({
    clientName: client.name,
    clientEmail: client.email,
    resetUrl: `${baseUrl}/reset-password?token=${token.token}`,
  })

  return NextResponse.json({ success: true })
}
