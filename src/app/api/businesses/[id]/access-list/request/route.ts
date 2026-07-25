import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// POST: public endpoint — user requests access (no auth required)
export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const { rut, name, email, phone, role } = await req.json()
  if (!rut || !name) return NextResponse.json({ error: "RUT y nombre son requeridos" }, { status: 400 })

  const existing = await prisma.businessAccessRequest.findUnique({
    where: { businessId_rut: { businessId: id, rut } },
  })
  if (existing) {
    if (existing.status === "APPROVED") return NextResponse.json({ status: "APPROVED" })
    if (existing.status === "PENDING") return NextResponse.json({ status: "PENDING" })
    // REJECTED — allow re-request
    const updated = await prisma.businessAccessRequest.update({
      where: { id: existing.id },
      data: { name, email: email ?? null, phone: phone ?? null, role: role ?? "OTRO", status: "PENDING" },
    })
    return NextResponse.json({ status: updated.status })
  }

  await prisma.businessAccessRequest.create({
    data: { businessId: id, rut, name, email: email ?? null, phone: phone ?? null, role: role ?? "OTRO", status: "PENDING" },
  })
  return NextResponse.json({ status: "PENDING" }, { status: 201 })
}
