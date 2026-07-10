import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; tournamentId: string; categoryId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { categoryId } = await params
  const { name, description } = await req.json()

  const category = await prisma.tournamentCategory.update({
    where: { id: categoryId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
    },
  })
  return NextResponse.json({ category })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { categoryId } = await params

  await prisma.tournamentCategory.delete({ where: { id: categoryId } })
  return NextResponse.json({ success: true })
}
