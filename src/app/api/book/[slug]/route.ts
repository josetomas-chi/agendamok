import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public endpoint — no auth required
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true, category: true, description: true, logo: true, phone: true,
      address: true, city: true,
      services: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, description: true, duration: true, price: true, color: true },
        orderBy: { name: "asc" },
      },
      staff: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, color: true, user: { select: { name: true, image: true } } },
      },
    },
  })

  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  return NextResponse.json({ business })
}
