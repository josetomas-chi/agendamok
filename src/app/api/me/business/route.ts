import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true, name: true, slug: true, currency: true, category: true, bsaleApiKey: true, businessType: true },
  })

  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  return NextResponse.json({ businessId: business.id, business })
}
