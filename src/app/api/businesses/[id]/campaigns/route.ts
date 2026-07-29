import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAdminNotification } from "@/lib/email"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const campaigns = await prisma.campaign.findMany({
    where: { businessId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json({ campaigns })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { name, subject, body, segment } = await req.json()

  if (!name?.trim() || !subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Nombre, asunto y mensaje son requeridos" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { id },
    select: { name: true, ownerId: true },
  })
  if (!business || business.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // Get target clients with email
  const clients = await prisma.client.findMany({
    where: {
      businessId: id,
      deletedAt: null,
      email: { not: null },
      ...(segment ? { segment: segment as never } : {}),
    },
    select: { name: true, email: true },
  })

  type ClientRow = { name: string; email: string | null }
  const recipients = (clients as ClientRow[])
    .filter(c => c.email?.includes("@"))
    .map(c => ({ name: c.name, email: c.email! }))

  // Create campaign record first
  const campaign = await prisma.campaign.create({
    data: { businessId: id, name, subject, body, segment: segment || null },
  })

  // Send emails (fire and await)
  let sent = 0
  let failed = 0
  if (recipients.length > 0) {
    const result = await sendAdminNotification({
      recipients,
      subject,
      message: body,
      businessName: business.name,
    })
    sent = result.sent
    failed = result.failed
  }

  // Update campaign with send stats
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { sentAt: new Date(), recipientCount: sent },
  })

  return NextResponse.json({ campaign, sent, failed, total: recipients.length }, { status: 201 })
}
