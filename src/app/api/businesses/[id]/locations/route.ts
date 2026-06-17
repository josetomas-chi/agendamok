import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const locations = await prisma.location.findMany({
    where: { businessId: id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ locations })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { name, address, city, phone, timezone } = body

  if (!name) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })

  const location = await prisma.location.create({
    data: {
      businessId: id,
      name,
      address: address || null,
      city: city || null,
      phone: phone || null,
      timezone: timezone || "America/Santiago",
    },
  })

  return NextResponse.json({ location }, { status: 201 })
}
