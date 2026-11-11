import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasBusinessAccess } from "@/lib/business-access"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  if (!(await hasBusinessAccess(id, session.user.id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const rut = searchParams.get("rut")?.trim()
  if (!rut) return NextResponse.json({ error: "RUT requerido" }, { status: 400 })

  const normalizedSearch = rut.replace(/[.\-\s]/g, "").toLowerCase()

  const clients = await prisma.client.findMany({
    where: { businessId: id, deletedAt: null, rut: { not: null } },
    select: { id: true, name: true, lastName: true, rut: true },
  })

  const match = clients.find(c =>
    c.rut && c.rut.replace(/[.\-\s]/g, "").toLowerCase() === normalizedSearch
  )

  if (!match) return NextResponse.json({ client: null })
  return NextResponse.json({ client: match })
}
