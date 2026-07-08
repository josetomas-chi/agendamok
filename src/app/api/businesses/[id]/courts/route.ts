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
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })
  return NextResponse.json({ courts })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { pricingRules = [], ...courtData } = body
  const cleanRules = pricingRules.map(({ id: _id, ...r }: { id?: string; name: string; days: number[]; startTime: string; endTime: string; price: number }) => ({
    name: r.name,
    days: r.days.map(Number),
    startTime: r.startTime,
    endTime: r.endTime,
    price: Number(r.price),
  }))
  const court = await prisma.court.create({
    data: {
      name: courtData.name,
      sport: courtData.sport || null,
      description: courtData.description || null,
      color: courtData.color || "#38bdf8",
      sponsorName: courtData.sponsorName || null,
      sponsorLogo: courtData.sponsorLogo || null,
      sponsorUrl: courtData.sponsorUrl || null,
      businessId: id,
      pricingRules: { create: cleanRules },
    },
    include: { pricingRules: true },
  })
  return NextResponse.json({ court }, { status: 201 })
}
