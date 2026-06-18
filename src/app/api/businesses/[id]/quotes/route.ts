import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const quotes = await prisma.quote.findMany({
    where: { businessId: id, deletedAt: null },
    include: {
      client: { select: { id: true, name: true, email: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ quotes })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { clientId, items, notes, discount, validUntil } = body

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "El presupuesto debe tener al menos un ítem" }, { status: 400 })
  }

  // Auto-increment quote number per business
  const last = await prisma.quote.findFirst({
    where: { businessId: id },
    orderBy: { number: "desc" },
    select: { number: true },
  })
  const number = (last?.number ?? 0) + 1

  const quote = await prisma.quote.create({
    data: {
      businessId: id,
      clientId: clientId || null,
      number,
      notes: notes || null,
      discount: discount || 0,
      validUntil: validUntil ? new Date(validUntil) : null,
      status: "DRAFT",
      items: {
        create: items.map((item: { description: string; quantity: number; unitPrice: number; serviceId?: string }) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          serviceId: item.serviceId || null,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      items: true,
    },
  })

  return NextResponse.json({ quote }, { status: 201 })
}
