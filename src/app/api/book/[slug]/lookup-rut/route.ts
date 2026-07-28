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

  const client = await prisma.client.findUnique({
    where: { businessId_rut: { businessId: business.id, rut } },
    select: { name: true, lastName: true, email: true, phone: true },
  })

  if (!client) return NextResponse.json({ found: false })

  return NextResponse.json({
    found: true,
    name: [client.name, client.lastName].filter(Boolean).join(" "),
    email: client.email ?? "",
    phone: client.phone ?? "",
  })
}
