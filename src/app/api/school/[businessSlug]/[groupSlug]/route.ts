import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ businessSlug: string; groupSlug: string }> }

// GET: public — group info for enrollment landing page
export async function GET(_req: Request, { params }: Params) {
  const { businessSlug, groupSlug } = await params

  const business = await prisma.business.findFirst({
    where: { slug: businessSlug, isActive: true, deletedAt: null },
    select: { id: true, name: true, logo: true, primaryColor: true, phone: true, city: true },
  })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  const group = await prisma.schoolGroup.findFirst({
    where: { businessId: business.id, slug: groupSlug, isActive: true },
    select: {
      id: true, name: true, sport: true, level: true, days: true,
      startTime: true, endTime: true, maxCapacity: true,
      monthlyPrice: true, billingCycle: true, color: true,
      startDate: true, endDate: true, notes: true, image: true, slug: true,
      coach: { select: { name: true, specialty: true, user: { select: { name: true, image: true } } } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  })
  if (!group) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })

  return NextResponse.json({ business, group })
}

// POST: public — submit enrollment request
export async function POST(req: Request, { params }: Params) {
  const { businessSlug, groupSlug } = await params
  const { name, rut, email, phone, notes } = await req.json()
  if (!name || !rut) return NextResponse.json({ error: "Nombre y RUT son requeridos" }, { status: 400 })

  const business = await prisma.business.findFirst({
    where: { slug: businessSlug, isActive: true, deletedAt: null },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  const group = await prisma.schoolGroup.findFirst({
    where: { businessId: business.id, slug: groupSlug, isActive: true },
    select: { id: true, maxCapacity: true, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
  })
  if (!group) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })

  // Upsert client by RUT or email
  let client = await prisma.client.findFirst({
    where: { businessId: business.id, rut },
    select: { id: true },
  })
  if (!client && email) {
    client = await prisma.client.findFirst({
      where: { businessId: business.id, email },
      select: { id: true },
    })
  }
  if (!client) {
    client = await prisma.client.create({
      data: { businessId: business.id, name, rut, email: email || null, phone: phone || null },
      select: { id: true },
    })
  }

  // Check if already enrolled
  const existing = await prisma.schoolEnrollment.findFirst({
    where: { groupId: group.id, clientId: client.id },
  })
  if (existing) {
    return NextResponse.json({ status: existing.status === "ACTIVE" ? "ALREADY_ENROLLED" : "PENDING" })
  }

  // Check capacity
  if (group._count.enrollments >= group.maxCapacity) {
    return NextResponse.json({ error: "El grupo está lleno", status: "FULL" }, { status: 409 })
  }

  const enrollment = await prisma.schoolEnrollment.create({
    data: {
      businessId: business.id,
      groupId: group.id,
      clientId: client.id,
      startDate: new Date(),
      status: "PENDING",
      notes: notes || null,
    },
  })

  return NextResponse.json({ status: enrollment.status }, { status: 201 })
}
