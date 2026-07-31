import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"
import { sendAccessRequestReceived } from "@/lib/email"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const { rut, name, email, phone, role } = await req.json()
  if (!rut || !name) return NextResponse.json({ error: "RUT y nombre son requeridos" }, { status: 400 })

  const existing = await prisma.businessAccessRequest.findUnique({
    where: { businessId_rut: { businessId: id, rut } },
  })

  if (existing) {
    if (existing.status === "APPROVED") return NextResponse.json({ status: "APPROVED" })
    if (existing.status === "PENDING") return NextResponse.json({ status: "PENDING" })
    // REJECTED — allow re-request
    const updated = await prisma.businessAccessRequest.update({
      where: { id: existing.id },
      data: { name, email: email ?? null, phone: phone ?? null, role: role ?? "OTRO", status: "PENDING" },
    })
    return NextResponse.json({ status: updated.status })
  }

  await prisma.businessAccessRequest.create({
    data: { businessId: id, rut, name, email: email ?? null, phone: phone ?? null, role: role ?? "OTRO", status: "PENDING" },
  })

  // Create user account if email provided and no account exists yet
  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (!existingUser) {
      const user = await prisma.user.create({
        data: { name, email, role: "CLIENT" },
      })

      const secret = process.env.NEXTAUTH_SECRET!
      const token = jwt.sign({ userId: user.id, type: "invite" }, secret, { expiresIn: "7d" })
      const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"
      const activateUrl = `${baseUrl}/invite/${token}`

      const business = await prisma.business.findUnique({ where: { id }, select: { name: true } })
      if (business) {
        sendAccessRequestReceived({ clientName: name, clientEmail: email, businessName: business.name, activateUrl }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ status: "PENDING" }, { status: 201 })
}
