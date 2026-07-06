import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const courts = await prisma.court.findMany({
    where: { businessId: id },
    include: { pricingRules: true, _count: { select: { bookings: true } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ courts })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { pricingRules = [], ...courtData } = body
  const court = await prisma.court.create({
    data: {
      ...courtData,
      businessId: id,
      pricingRules: { create: pricingRules },
    },
    include: { pricingRules: true },
  })
  return NextResponse.json({ court }, { status: 201 })
}
