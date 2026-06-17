import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const discounts = await prisma.discountCode.findMany({ where: { businessId: id }, orderBy: { createdAt: "desc" } })
  return NextResponse.json({ discounts })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.discountCode.findUnique({ where: { businessId_code: { businessId: id, code: body.code } } })
  if (existing) return NextResponse.json({ error: "Ese código ya existe" }, { status: 400 })

  const discount = await prisma.discountCode.create({ data: { ...body, businessId: id } })
  return NextResponse.json({ discount }, { status: 201 })
}
