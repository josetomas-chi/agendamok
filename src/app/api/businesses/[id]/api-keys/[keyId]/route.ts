import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; keyId: string }> }

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, keyId } = await params

  await prisma.apiKey.delete({ where: { id: keyId, businessId: id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, keyId } = await params

  const { isActive } = await req.json()
  const apiKey = await prisma.apiKey.update({
    where: { id: keyId, businessId: id },
    data: { isActive },
  })
  return NextResponse.json({ apiKey })
}
