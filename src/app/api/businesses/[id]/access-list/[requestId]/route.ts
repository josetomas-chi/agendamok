import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

  const entry = await prisma.businessAccessRequest.update({
    where: { id: requestId, businessId: id },
    data,
  })
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
