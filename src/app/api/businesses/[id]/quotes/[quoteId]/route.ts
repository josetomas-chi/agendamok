import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; quoteId: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, quoteId } = await params

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, businessId: id, deletedAt: null },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      items: { include: { service: { select: { name: true, color: true } } } },
      business: { select: { name: true, phone: true, address: true, city: true, currency: true } },
    },
  })

  if (!quote) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ quote })
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, quoteId } = await params

  const body = await req.json()
  const { status, clientId, items, notes, discount, validUntil } = body

  // If updating items, replace them all
  if (items !== undefined) {
    await prisma.quoteItem.deleteMany({ where: { quoteId } })
    await prisma.quoteItem.createMany({
      data: items.map((item: { description: string; quantity: number; unitPrice: number; serviceId?: string }) => ({
        quoteId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        serviceId: item.serviceId || null,
      })),
    })
  }

  const quote = await prisma.quote.update({
    where: { id: quoteId, businessId: id },
    data: {
      ...(status !== undefined && { status }),
      ...(clientId !== undefined && { clientId: clientId || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(discount !== undefined && { discount }),
      ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      items: true,
    },
  })

  return NextResponse.json({ quote })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, quoteId } = await params

  await prisma.quote.update({
    where: { id: quoteId, businessId: id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
