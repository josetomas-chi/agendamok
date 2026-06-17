import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  duration: z.number().int().min(5),
  price: z.number().min(0),
  deposit: z.number().min(0).optional().nullable(),
  color: z.string().default("#6366f1"),
  requiresDeposit: z.boolean().default(false),
  bufferAfter: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

async function getBusinessId(userId: string) {
  const b = await prisma.business.findUnique({ where: { ownerId: userId }, select: { id: true } })
  return b?.id
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const services = await prisma.service.findMany({
    where: { businessId: id, deletedAt: null },
    include: { category: true },
    orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
  })

  const categories = await prisma.serviceCategory.findMany({
    where: { businessId: id, deletedAt: null },
    orderBy: { order: "asc" },
  })

  return NextResponse.json({ services, categories })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const businessId = await getBusinessId(session.user.id)
  if (businessId !== id) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  try {
    const body = await req.json()
    const data = schema.parse(body)
    const service = await prisma.service.create({ data: { ...data, businessId: id } })
    return NextResponse.json({ service }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
