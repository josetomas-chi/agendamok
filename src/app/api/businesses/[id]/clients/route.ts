import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(1),
  lastName: z.string().optional().nullable(),
  rut: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
})

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const segment = searchParams.get("segment") || ""

  const clients = await prisma.client.findMany({
    where: {
      businessId: id,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      }),
      ...(segment && { segment: segment as never }),
    },
    include: {
      _count: { select: { appointments: { where: { deletedAt: null } } } },
      appointments: {
        where: { deletedAt: null, status: "COMPLETED" },
        select: { payment: { select: { amount: true } } },
        take: 100,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ clients })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)

    if (data.rut) {
      const existing = await prisma.client.findUnique({
        where: { businessId_rut: { businessId: id, rut: data.rut } },
      })
      if (existing) return NextResponse.json({ error: "Ya existe un cliente con ese RUT" }, { status: 409 })
    }

    // Auto-link to user account if email matches a registered user
    let userId: string | undefined
    if (data.email) {
      const matchedUser = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } })
      if (matchedUser) userId = matchedUser.id
    }

    const client = await prisma.client.create({ data: { ...data, businessId: id, ...(userId ? { userId } : {}) } })

    // If business is closed-access and client has RUT, auto-approve in access list
    if (data.rut) {
      const business = await prisma.business.findUnique({ where: { id }, select: { accessMode: true } })
      if (business?.accessMode === "CLOSED") {
        await prisma.businessAccessRequest.upsert({
          where: { businessId_rut: { businessId: id, rut: data.rut } },
          update: { status: "APPROVED", name: data.name, email: data.email ?? null, phone: data.phone ?? null },
          create: { businessId: id, rut: data.rut, name: data.name, email: data.email ?? null, phone: data.phone ?? null, status: "APPROVED" },
        })
      }
    }

    return NextResponse.json({ client }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
