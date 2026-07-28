import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")?.trim()
  if (!email) return NextResponse.json({ exists: false })

  const [user, business] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.business.findUnique({ where: { slug }, select: { id: true } }),
  ])

  if (!business) return NextResponse.json({ exists: !!user })

  // First: look in this business
  let client = await prisma.client.findFirst({
    where: { businessId: business.id, email, deletedAt: null },
    select: { name: true, lastName: true, phone: true },
  })

  // Fallback: look in any other business on the platform
  if (!client) {
    client = await prisma.client.findFirst({
      where: { email, deletedAt: null, NOT: { businessId: business.id } },
      select: { name: true, lastName: true, phone: true },
      orderBy: { updatedAt: "desc" },
    })
  }

  return NextResponse.json({
    exists: !!user,
    name: client ? [client.name, client.lastName].filter(Boolean).join(" ") : undefined,
    phone: client?.phone ?? undefined,
  })
}
