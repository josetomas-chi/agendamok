import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public endpoint — no auth required
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true, category: true, description: true, logo: true, phone: true,
      address: true, city: true, onlinePaymentsEnabled: true, primaryColor: true,
      coverImage: true, businessType: true,
      courts: {
        where: { isActive: true },
        select: { id: true, name: true, sport: true, color: true, description: true, sponsorName: true, sponsorLogo: true, sponsorUrl: true, pricingRules: { select: { days: true, startTime: true, endTime: true, price: true } } },
        orderBy: { sortOrder: "asc" },
      },
      services: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, description: true, duration: true, price: true, color: true, categoryId: true,
          category: { select: { id: true, name: true, order: true } } },
        orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
      },
      staff: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, color: true, specialty: true, bio: true, user: { select: { name: true, image: true } } },
      },
    },
  })

  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  return NextResponse.json({ business })
}
