import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// GET: list all access requests for this business
export async function GET(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") // PENDING | APPROVED | REJECTED | null (all)

  const requests = await prisma.businessAccessRequest.findMany({
    where: { businessId: id, ...(status ? { status } : {}) },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json({ requests })
}

// POST: add one RUT to the approved list (by admin) or bulk import
export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  // Bulk import: { entries: [{ rut, name, role, email, phone }] }
  if (Array.isArray(body.entries)) {
    const results = await Promise.allSettled(
      body.entries.map((e: { rut: string; name: string; role?: string; email?: string; phone?: string }) =>
        prisma.businessAccessRequest.upsert({
          where: { businessId_rut: { businessId: id, rut: e.rut } },
          update: { name: e.name, role: e.role ?? "OTRO", email: e.email ?? null, phone: e.phone ?? null, status: "APPROVED" },
          create: { businessId: id, rut: e.rut, name: e.name, role: e.role ?? "OTRO", email: e.email ?? null, phone: e.phone ?? null, status: "APPROVED" },
        })
      )
    )
    const ok = results.filter(r => r.status === "fulfilled").length
    return NextResponse.json({ ok, total: body.entries.length })
  }

  // Single entry
  const { rut, name, role, email, phone } = body
  if (!rut || !name) return NextResponse.json({ error: "RUT y nombre son requeridos" }, { status: 400 })

  const entry = await prisma.businessAccessRequest.upsert({
    where: { businessId_rut: { businessId: id, rut } },
    update: { name, role: role ?? "OTRO", email: email ?? null, phone: phone ?? null, status: "APPROVED" },
    create: { businessId: id, rut, name, role: role ?? "OTRO", email: email ?? null, phone: phone ?? null, status: "APPROVED" },
  })
  return NextResponse.json({ entry }, { status: 201 })
}
