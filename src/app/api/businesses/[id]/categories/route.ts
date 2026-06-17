import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { name } = await req.json()

  const count = await prisma.serviceCategory.count({ where: { businessId: id } })
  const category = await prisma.serviceCategory.create({ data: { businessId: id, name, order: count } })
  return NextResponse.json({ category }, { status: 201 })
}
