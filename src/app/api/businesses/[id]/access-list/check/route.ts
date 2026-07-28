import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

// GET: public endpoint — check if a RUT or email is approved for this business
// ?rut=12345678-9  OR  ?email=user@example.com
export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const rut = searchParams.get("rut")?.trim()
  const email = searchParams.get("email")?.trim()
  if (!rut && !email) return NextResponse.json({ allowed: false, status: null })

  const business = await prisma.business.findUnique({
    where: { id },
    select: { accessMode: true },
  })
  if (!business) return NextResponse.json({ allowed: false, status: null })
  if (business.accessMode === "OPEN") return NextResponse.json({ allowed: true, status: "OPEN" })

  const entry = rut
    ? await prisma.businessAccessRequest.findUnique({
        where: { businessId_rut: { businessId: id, rut } },
        select: { status: true, name: true, email: true, phone: true, role: true, rut: true },
      })
    : await prisma.businessAccessRequest.findFirst({
        where: { businessId: id, email },
        select: { status: true, name: true, email: true, phone: true, role: true, rut: true },
      })

  if (!entry) return NextResponse.json({ allowed: false, status: "NOT_FOUND" })
  if (entry.status === "APPROVED") return NextResponse.json({ allowed: true, status: "APPROVED", name: entry.name, email: entry.email, phone: entry.phone, role: entry.role, rut: entry.rut })
  if (entry.status === "PENDING") return NextResponse.json({ allowed: false, status: "PENDING" })
  return NextResponse.json({ allowed: false, status: "REJECTED" })
}
