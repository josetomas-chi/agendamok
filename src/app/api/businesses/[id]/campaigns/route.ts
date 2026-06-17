import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { name, subject, body, segment } = await req.json()

  const campaign = await prisma.campaign.create({
    data: { businessId: id, name, subject, body, segment: segment || null },
  })
  return NextResponse.json({ campaign }, { status: 201 })
}
