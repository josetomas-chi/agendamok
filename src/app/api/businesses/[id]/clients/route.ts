import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { normalizeText } from "@/lib/normalize-text"
import { hasBusinessAccess } from "@/lib/business-access"
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
  if (!(await hasBusinessAccess(id, session.user.id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const segment = searchParams.get("segment") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = 100
  const skip = (page - 1) * limit

  const baseWhere = {
    businessId: id,
    deletedAt: null,
    ...(segment && { segment: segment as never }),
  }

  const include = {
    _count: { select: { appointments: { where: { deletedAt: null } }, courtBookings: { where: { deletedAt: null } } } },
    appointments: {
      where: { deletedAt: null, status: "COMPLETED" as const },
      select: { payment: { select: { amount: true } } },
      take: 100,
    },
  }

  if (search) {
    // Prisma's `contains` is accent-sensitive (e.g. "Tomas" won't match "Tomás"), so we
    // match in JS — but only over lightweight scalar fields, not the full include (which
    // has joins/aggregates per row and was the actual cost on businesses with many clients).
    // The heavier `include` is only fetched afterwards, for the paginated result page.
    const normalizedSearch = normalizeText(search)
    const candidates = await prisma.client.findMany({
      where: baseWhere,
      select: { id: true, name: true, lastName: true, email: true, phone: true, rut: true },
      orderBy: [{ lastName: "asc" }, { name: "asc" }],
    })
    const matchedIds = candidates
      .filter((c: { name: string; lastName: string | null; email: string | null; phone: string | null; rut: string | null }) => {
        const fullName = normalizeText([c.name, c.lastName].filter(Boolean).join(" "))
        return fullName.includes(normalizedSearch) ||
          normalizeText(c.name).includes(normalizedSearch) ||
          (c.lastName && normalizeText(c.lastName).includes(normalizedSearch)) ||
          (c.email && normalizeText(c.email).includes(normalizedSearch)) ||
          (c.phone && c.phone.includes(search)) ||
          (c.rut && c.rut.includes(search))
      })
      .map((c: { id: string }) => c.id)

    const total = matchedIds.length
    const pageIds = matchedIds.slice(skip, skip + limit)
    const pageClients = pageIds.length
      ? await prisma.client.findMany({ where: { id: { in: pageIds } }, include })
      : []
    // Prisma doesn't preserve `in` order, so re-sort to match the paginated order above
    const order = new Map<string, number>(pageIds.map((id: string, i: number) => [id, i]))
    const clients = pageClients.sort((a: { id: string }, b: { id: string }) => order.get(a.id)! - order.get(b.id)!)

    return NextResponse.json({ clients, total, page, pages: Math.ceil(total / limit) })
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where: baseWhere,
      include,
      orderBy: [{ lastName: "asc" }, { name: "asc" }],
      skip,
      take: limit,
    }),
    prisma.client.count({ where: baseWhere }),
  ])

  return NextResponse.json({ clients, total, page, pages: Math.ceil(total / limit) })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  if (!(await hasBusinessAccess(id, session.user.id))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const business = await prisma.business.findUnique({ where: { id }, select: { requireClientRut: true, accessMode: true } })
    if (business?.requireClientRut && !data.rut) {
      return NextResponse.json({ error: "El RUT es obligatorio para crear un cliente en este negocio" }, { status: 400 })
    }

    if (data.rut) {
      const existing = await prisma.client.findUnique({
        where: { businessId_rut: { businessId: id, rut: data.rut } },
      })
      if (existing) return NextResponse.json({ error: "Ya existe un cliente con ese RUT" }, { status: 409 })
    }

    if (data.email) {
      const emailConflict = await prisma.client.findFirst({
        where: { businessId: id, email: { equals: data.email, mode: "insensitive" }, deletedAt: null },
        select: { id: true },
      })
      if (emailConflict) return NextResponse.json({ error: "Ya existe un cliente con ese email" }, { status: 409 })
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
