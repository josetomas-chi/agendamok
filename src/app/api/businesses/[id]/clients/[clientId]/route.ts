import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, clientId } = await params
  const business = await prisma.business.findUnique({ where: { id, ownerId: session.user.id } })
  if (!business) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const body = await req.json()
  const allowed = ["name", "lastName", "rut", "email", "phone", "gender", "notes", "tags", "creditBalance", "segment"]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  if (data.rut) {
    const conflict = await prisma.client.findFirst({
      where: { businessId: id, rut: data.rut as string, NOT: { id: clientId } },
    })
    if (conflict) return NextResponse.json({ error: "Ya existe un cliente con ese RUT" }, { status: 409 })
  }

  const client = await prisma.client.update({ where: { id: clientId }, data })
  return NextResponse.json({ client })
}
