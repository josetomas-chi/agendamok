import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Temporary endpoint — delete after use
// Activates all courts that have pricing rules but isActive = false
export async function POST() {
  const inactive = await prisma.court.findMany({
    where: { isActive: false },
    select: { id: true, name: true, businessId: true, _count: { select: { pricingRules: true } } },
  })

  const toActivate = inactive.filter(c => c._count.pricingRules > 0)

  await prisma.court.updateMany({
    where: { id: { in: toActivate.map(c => c.id) } },
    data: { isActive: true },
  })

  return NextResponse.json({ activated: toActivate.map(c => ({ id: c.id, name: c.name })) })
}
