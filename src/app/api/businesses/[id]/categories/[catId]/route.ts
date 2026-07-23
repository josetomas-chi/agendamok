import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; catId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, catId } = await params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const category = await prisma.serviceCategory.updateMany({
    where: { id: catId, businessId: id },
    data: { name: name.trim() },
  })
  if (category.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, catId } = await params

  // Unlink services from this category before deleting
  await prisma.service.updateMany({
    where: { categoryId: catId, businessId: id },
    data: { categoryId: null },
  })

  await prisma.serviceCategory.deleteMany({ where: { id: catId, businessId: id } })
  return NextResponse.json({ ok: true })
}
