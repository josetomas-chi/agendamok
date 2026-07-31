import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"
import { sendAccessRequestReceived } from "@/lib/email"

export async function POST(req: Request) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { email, name, businessId } = await req.json()
  if (!email || !name) return NextResponse.json({ error: "email y name requeridos" }, { status: 400 })

  let user = await prisma.user.findUnique({ where: { email }, select: { id: true, password: true } })

  if (!user) {
    user = await prisma.user.create({ data: { email, name, role: "CLIENT" }, select: { id: true, password: true } })
  }

  // Create Client record if businessId provided
  if (businessId && !user.password) {
    const existing = await prisma.client.findFirst({ where: { businessId, userId: user.id, deletedAt: null } })
    if (!existing) {
      const byEmail = await prisma.client.findFirst({ where: { businessId, email, deletedAt: null } })
      if (byEmail) {
        await prisma.client.update({ where: { id: byEmail.id }, data: { userId: user.id } })
      } else {
        await prisma.client.create({ data: { businessId, userId: user.id, name, email, allowTransfer: true } })
      }
    }
  }

  const secret = process.env.NEXTAUTH_SECRET!
  const token = jwt.sign({ userId: user.id, type: "invite" }, secret, { expiresIn: "7d" })
  const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"
  const activateUrl = `${baseUrl}/invite/${token}`

  if (!user.password && businessId) {
    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } })
    if (business) {
      sendAccessRequestReceived({ clientName: name, clientEmail: email, businessName: business.name, activateUrl }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true, activateUrl })
}
