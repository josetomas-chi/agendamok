import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isClinicalCategory } from "@/lib/clinical"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const business = await prisma.business.findUnique({
    where: { id },
    include: { subscription: true, locations: { where: { deletedAt: null } } },
  })

  return NextResponse.json({ business, subscription: business?.subscription || null })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const body = await req.json()

  // Auto-enable clinical records when category changes to a health category
  if (body.category) {
    const current = await prisma.business.findUnique({ where: { id }, select: { clinicalRecordEnabled: true } })
    if (!current?.clinicalRecordEnabled && isClinicalCategory(body.category)) {
      body.clinicalRecordEnabled = true
    }
  }

  // If a new slug is provided explicitly, validate uniqueness
  if (body.slug !== undefined) {
    const clean = body.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    if (!clean) return NextResponse.json({ error: "Slug inválido" }, { status: 400 })
    const conflict = await prisma.business.findFirst({ where: { slug: clean, id: { not: id } } })
    if (conflict) return NextResponse.json({ error: "Ese slug ya está en uso" }, { status: 400 })
    body.slug = clean
  }

  const previous = await prisma.business.findUnique({ where: { id }, select: { accessMode: true } })
  const business = await prisma.business.update({ where: { id }, data: body })

  // When switching to CLOSED, create PENDING entries for existing clients with RUT not already in access list
  if (body.accessMode === "CLOSED" && previous?.accessMode !== "CLOSED") {
    const clients = await prisma.client.findMany({
      where: { businessId: id, deletedAt: null, rut: { not: null } },
      select: { rut: true, name: true, email: true, phone: true },
    })
    const existing = await prisma.businessAccessRequest.findMany({
      where: { businessId: id },
      select: { rut: true },
    })
    const existingRuts = new Set(existing.map(e => e.rut))
    const toCreate = clients.filter(c => c.rut && !existingRuts.has(c.rut!))
    if (toCreate.length > 0) {
      await prisma.businessAccessRequest.createMany({
        data: toCreate.map(c => ({ businessId: id, rut: c.rut!, name: c.name, email: c.email ?? null, phone: c.phone ?? null, status: "PENDING" })),
        skipDuplicates: true,
      })
    }
  }

  return NextResponse.json({ business })
}
