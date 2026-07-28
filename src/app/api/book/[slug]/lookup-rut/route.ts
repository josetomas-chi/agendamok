import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const rut = searchParams.get("rut")?.trim()
  if (!rut) return NextResponse.json({ found: false })

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ found: false })

  // First: look in this business
  let client = await prisma.client.findUnique({
    where: { businessId_rut: { businessId: business.id, rut } },
    select: { name: true, lastName: true, email: true, phone: true },
  })

  // Fallback: look in any other business on the platform
  if (!client) {
    client = await prisma.client.findFirst({
      where: { rut, deletedAt: null, NOT: { businessId: business.id } },
      select: { name: true, lastName: true, email: true, phone: true },
      orderBy: { updatedAt: "desc" },
    })
  }

  if (!client) return NextResponse.json({ found: false })

  return NextResponse.json({
    found: true,
    name: [client.name, client.lastName].filter(Boolean).join(" "),
    email: client.email ?? "",
    phone: client.phone ?? "",
  })
}
