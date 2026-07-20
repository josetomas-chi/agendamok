import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET — validate token and return invite info
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const member = await prisma.businessMember.findUnique({
    where: { inviteToken: token },
    include: {
      business: { select: { name: true } },
      user: { select: { email: true, password: true } },
    },
  })

  if (!member) return NextResponse.json({ error: "Invitación no válida o expirada" }, { status: 404 })

  return NextResponse.json({
    businessName: member.business.name,
    email: member.user.email,
    hasPassword: !!member.user.password,
    alreadyAccepted: !!member.acceptedAt,
  })
}

// POST — accept invite (set password if needed, mark as accepted)
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { password } = await req.json()

  const member = await prisma.businessMember.findUnique({
    where: { inviteToken: token },
    include: { user: true },
  })

  if (!member) return NextResponse.json({ error: "Invitación no válida o expirada" }, { status: 404 })
  if (member.acceptedAt) return NextResponse.json({ error: "Invitación ya aceptada" }, { status: 409 })

  // Set password if user doesn't have one yet
  if (!member.user.password) {
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
    }
    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: member.userId },
      data: { password: hashed, role: "RECEPTIONIST" },
    })
  } else {
    await prisma.user.update({
      where: { id: member.userId },
      data: { role: "RECEPTIONIST" },
    })
  }

  // Mark member as accepted and clear token
  await prisma.businessMember.update({
    where: { id: member.id },
    data: { acceptedAt: new Date(), inviteToken: null },
  })

  return NextResponse.json({ success: true, email: member.user.email })
}
