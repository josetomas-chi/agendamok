import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiKey } from "@/lib/apikey"

export async function GET(req: Request) {
  const businessId = await authenticateApiKey(req)
  if (!businessId) return NextResponse.json({ error: "API key inválida" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("q")

  const clients = await prisma.client.findMany({
    where: {
      businessId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
    orderBy: { name: "asc" },
    take: 100,
  })

  return NextResponse.json({ clients })
}
