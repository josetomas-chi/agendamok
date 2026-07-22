import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"
import { sendInvite } from "@/lib/email"

export async function GET() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const businesses = await prisma.business.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, slug: true, category: true, createdAt: true,
      isActive: true, businessType: true, chatBotEnabled: true, whatsappBotEnabled: true,
      owner: { select: { name: true, email: true } },
      subscription: { select: { plan: true, status: true, isCourtesy: true } },
      _count: { select: { appointments: true, staff: true, clients: true } },
    },
  })

  return NextResponse.json({ businesses })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { ownerName, ownerEmail, businessName, slug, category, plan } = await req.json()

  if (!ownerName || !ownerEmail || !businessName || !slug || !category) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } })
    if (existingUser) return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })

    const existingSlug = await prisma.business.findUnique({ where: { slug } })
    if (existingSlug) return NextResponse.json({ error: "El slug ya está en uso" }, { status: 409 })

    const user = await prisma.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        role: "BUSINESS_OWNER",
        businessOwner: {
          create: {
            name: businessName,
            slug,
            category,
            subscription: {
              create: {
                plan: plan || "FREE",
                status: "TRIALING",
                trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      },
    })

    const secret = process.env.NEXTAUTH_SECRET!
    const token = jwt.sign({ userId: user.id, type: "invite" }, secret, { expiresIn: "7d" })

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3002"
    const inviteUrl = `${baseUrl}/invite/${token}`

    sendInvite({ ownerName, ownerEmail, businessName, inviteUrl }).catch(() => {})

    return NextResponse.json({ inviteUrl }, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido"
    console.error("[POST /api/admin/businesses]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
