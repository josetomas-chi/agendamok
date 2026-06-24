import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const business = await prisma.business.findUnique({
    where: { id },
    select: { ownerId: true, bsaleApiKey: true, bsaleAutoInvoice: true, bsaleDocType: true },
  })

  if (!business || business.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  return NextResponse.json({
    hasKey: !!business.bsaleApiKey,
    bsaleAutoInvoice: business.bsaleAutoInvoice,
    bsaleDocType: business.bsaleDocType,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const business = await prisma.business.findUnique({
    where: { id },
    select: { ownerId: true },
  })

  if (!business || business.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const { bsaleApiKey, bsaleAutoInvoice, bsaleDocType, clearKey } = body

  const data: Record<string, unknown> = {}
  if (clearKey) data.bsaleApiKey = null
  else if (bsaleApiKey) data.bsaleApiKey = bsaleApiKey
  if (bsaleAutoInvoice !== undefined) data.bsaleAutoInvoice = bsaleAutoInvoice
  if (bsaleDocType) data.bsaleDocType = bsaleDocType

  await prisma.business.update({ where: { id }, data })

  return NextResponse.json({ ok: true })
}
