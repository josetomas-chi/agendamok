import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiKey } from "@/lib/apikey"

export async function GET(req: Request) {
  const businessId = await authenticateApiKey(req)
  if (!businessId) return NextResponse.json({ error: "API key inválida" }, { status: 401 })

  const services = await prisma.service.findMany({
    where: { businessId, isActive: true, deletedAt: null },
    select: { id: true, name: true, description: true, duration: true, price: true, color: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ services })
}
