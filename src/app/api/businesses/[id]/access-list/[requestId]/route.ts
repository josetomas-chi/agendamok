import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAccessApproved } from "@/lib/email"
import jwt from "jsonwebtoken"

type Params = { params: Promise<{ id: string; requestId: string }> }

// PATCH: approve / reject / update
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, requestId } = await params
  const body = await req.json()
  const allowed = ["status", "role", "name", "email", "phone", "notes"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) data[k] = body[k]

  const previous = await prisma.businessAccessRequest.findUnique({ where: { id: requestId }, select: { status: true } })

  const entry = await prisma.businessAccessRequest.update({
    where: { id: requestId, businessId: id },
    data,
  })

  const business = entry.email
    ? await prisma.business.findUnique({ where: { id }, select: { name: true, slug: true } })
    : null
  const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"

  if (body.status === "APPROVED" && previous?.status !== "APPROVED") {
    const user = entry.email
      ? await prisma.user.findUnique({ where: { email: entry.email }, select: { id: true, password: true } })
      : null

    // Create Client record in the business if it doesn't exist yet
    if (user) {
      const existingClient = await prisma.client.findFirst({
        where: { businessId: id, userId: user.id, deletedAt: null },
      })
      if (!existingClient) {
        // Also check by email in case there's an unlinked client
        const clientByEmail = entry.email
          ? await prisma.client.findFirst({ where: { businessId: id, email: entry.email, deletedAt: null } })
          : null
        if (clientByEmail) {
          await prisma.client.update({ where: { id: clientByEmail.id }, data: { userId: user.id } })
        } else {
          await prisma.client.create({
            data: {
              businessId: id,
              userId: user.id,
              name: entry.name,
              email: entry.email ?? undefined,
              phone: entry.phone ?? undefined,
              rut: entry.rut ?? undefined,
              allowTransfer: true,
            },
          })
        }
      }
    }

    if (entry.email && business) {
      if (user && !user.password) {
        const secret = process.env.NEXTAUTH_SECRET!
        const token = jwt.sign({ userId: user.id, type: "invite" }, secret, { expiresIn: "7d" })
        const activateUrl = `${baseUrl}/invite/${token}`
        sendAccessApproved({
          clientName: entry.name,
          clientEmail: entry.email,
          businessName: business.name,
          bookingUrl: activateUrl,
        }).catch(() => {})
      } else {
        sendAccessApproved({
          clientName: entry.name,
          clientEmail: entry.email,
          businessName: business.name,
          bookingUrl: `${baseUrl}/book/${business.slug}`,
        }).catch(() => {})
      }
    }
  }

  if (body.status === "REJECTED" && previous?.status !== "REJECTED" && entry.email) {
    // Delete account if it has no password (was auto-created on request, never activated)
    const user = await prisma.user.findUnique({
      where: { email: entry.email },
      select: { id: true, password: true, _count: { select: { appointments: true } } },
    })
    if (user && !user.password && user._count.appointments === 0) {
      await prisma.user.delete({ where: { id: user.id } })
    }
  }

  return NextResponse.json({ entry })
}

// DELETE: remove from list
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, requestId } = await params
  await prisma.businessAccessRequest.delete({ where: { id: requestId, businessId: id } })
  return NextResponse.json({ ok: true })
}
