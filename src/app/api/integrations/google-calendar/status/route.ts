import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { disconnectGoogleCalendar } from "@/lib/google-calendar"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, select: { id: true } })
  if (!business) return NextResponse.json({ connected: false })

  const integration = await prisma.googleCalendarIntegration.findUnique({
    where: { businessId: business.id },
    select: { id: true, createdAt: true },
  })

  return NextResponse.json({ connected: !!integration, connectedAt: integration?.createdAt ?? null })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, select: { id: true } })
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 })

  await disconnectGoogleCalendar(business.id)
  return NextResponse.json({ ok: true })
}
