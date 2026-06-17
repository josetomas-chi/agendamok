import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  duration: z.number().int().min(5).optional(),
  price: z.number().min(0).optional(),
  deposit: z.number().min(0).optional().nullable(),
  color: z.string().optional(),
  requiresDeposit: z.boolean().optional(),
  bufferAfter: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { serviceId } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)
    const service = await prisma.service.update({ where: { id: serviceId }, data })
    return NextResponse.json({ service })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { serviceId } = await params

  await prisma.service.update({ where: { id: serviceId }, data: { deletedAt: new Date() } })
  return NextResponse.json({ success: true })
}
