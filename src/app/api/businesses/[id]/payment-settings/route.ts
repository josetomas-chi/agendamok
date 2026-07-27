import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const business = await prisma.business.findFirst({
    where: { id, ownerId: session.user.id, deletedAt: null },
    select: { onlinePaymentsEnabled: true, flowApiKey: true, mpConnected: true, mpPublicKey: true },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  return NextResponse.json({
    onlinePaymentsEnabled: business.onlinePaymentsEnabled,
    hasCredentials: !!business.flowApiKey,
    mpConnected: business.mpConnected,
    mpPublicKey: business.mpPublicKey,
  })
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const business = await prisma.business.findFirst({
    where: { id, ownerId: session.user.id, deletedAt: null },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (typeof body.onlinePaymentsEnabled === "boolean") {
    data.onlinePaymentsEnabled = body.onlinePaymentsEnabled
  }
  if (typeof body.flowApiKey === "string" && body.flowApiKey.trim()) {
    data.flowApiKey = body.flowApiKey.trim()
  }
  if (typeof body.flowSecretKey === "string" && body.flowSecretKey.trim()) {
    data.flowSecretKey = body.flowSecretKey.trim()
  }
  // Allow clearing credentials
  if (body.clearCredentials === true) {
    data.flowApiKey = null
    data.flowSecretKey = null
    data.onlinePaymentsEnabled = false
  }

  const updated = await prisma.business.update({ where: { id }, data })

  return NextResponse.json({
    onlinePaymentsEnabled: updated.onlinePaymentsEnabled,
    hasCredentials: !!updated.flowApiKey,
    mpConnected: updated.mpConnected,
    mpPublicKey: updated.mpPublicKey,
  })
}
