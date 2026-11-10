import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const benefits = await prisma.loyaltyBenefit.findMany({
    where: { businessId: id },
    orderBy: { pointsCost: "asc" },
  })
  return NextResponse.json({ benefits })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { name, description, pointsCost, category } = body
  if (!name || !pointsCost) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })
  const benefit = await prisma.loyaltyBenefit.create({
    data: { businessId: id, name, description: description || null, pointsCost: Number(pointsCost), category: category || "general" },
  })
  return NextResponse.json({ benefit })
}
