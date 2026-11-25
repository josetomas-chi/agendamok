import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// Try to decode a JWT client invite token (apoderado/access-request flow)
function decodeClientInvite(token: string): { userId: string } | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET!
    const payload = jwt.verify(token, secret) as { userId?: string; type?: string }
    if (payload.type === "invite" && payload.userId) return { userId: payload.userId }
    return null
  } catch {
    return null
  }
}

// GET — validate token and return invite info
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // 1. Try BusinessMember invite (staff)
  const member = await prisma.businessMember.findUnique({
    where: { inviteToken: token },
    include: {
      business: { select: { name: true } },
      user: { select: { email: true, password: true } },
    },
  })
  if (member) {
    return NextResponse.json({
      businessName: member.business.name,
      email: member.user.email,
      hasPassword: !!member.user.password,
      alreadyAccepted: !!member.acceptedAt,
      tokenType: "member",
    })
  }

  // 2. Try JWT client invite (apoderado / access-request flow)
  const clientPayload = decodeClientInvite(token)
  if (clientPayload) {
    const user = await prisma.user.findUnique({
      where: { id: clientPayload.userId },
      select: { email: true, password: true },
    })
    if (!user) return NextResponse.json({ error: "Invitación no válida o expirada" }, { status: 404 })
    return NextResponse.json({
      businessName: "",
      email: user.email,
      hasPassword: !!user.password,
      alreadyAccepted: !!user.password,
      tokenType: "client",
    })
  }

  return NextResponse.json({ error: "Invitación no válida o expirada" }, { status: 404 })
}

// POST — accept invite (set password if needed, mark as accepted)
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { password } = await req.json()

  // 1. Try BusinessMember invite (staff)
  const member = await prisma.businessMember.findUnique({
    where: { inviteToken: token },
    include: { user: true },
  })
  if (member) {
    if (member.acceptedAt) return NextResponse.json({ error: "Invitación ya aceptada" }, { status: 409 })
    if (!member.user.password) {
      if (!password || password.length < 8)
        return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
      const hashed = await bcrypt.hash(password, 12)
      await prisma.user.update({ where: { id: member.userId }, data: { password: hashed, role: "RECEPTIONIST" } })
    } else {
      await prisma.user.update({ where: { id: member.userId }, data: { role: "RECEPTIONIST" } })
    }
    await prisma.businessMember.update({ where: { id: member.id }, data: { acceptedAt: new Date(), inviteToken: null } })
    return NextResponse.json({ success: true, email: member.user.email })
  }

  // 2. Try JWT client invite (apoderado / access-request flow)
  const clientPayload = decodeClientInvite(token)
  if (clientPayload) {
    const user = await prisma.user.findUnique({ where: { id: clientPayload.userId } })
    if (!user) return NextResponse.json({ error: "Invitación no válida o expirada" }, { status: 404 })
    if (user.password) return NextResponse.json({ error: "Ya creaste tu contraseña, inicia sesión normalmente" }, { status: 409 })
    if (!password || password.length < 8)
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
    return NextResponse.json({ success: true, email: user.email })
  }

  return NextResponse.json({ error: "Invitación no válida o expirada" }, { status: 404 })
}
