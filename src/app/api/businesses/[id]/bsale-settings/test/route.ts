import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { bsaleTestConnection } from "@/lib/bsale"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const business = await prisma.business.findUnique({
    where: { id },
    select: { ownerId: true, bsaleApiKey: true },
  })

  if (!business || business.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (!business.bsaleApiKey) {
    return NextResponse.json({ ok: false, error: "API Key no configurada" })
  }

  const ok = await bsaleTestConnection(business.bsaleApiKey)
  return NextResponse.json({ ok })
}
