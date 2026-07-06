import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendQuoteEmail } from "@/lib/email"

type Params = { params: Promise<{ id: string; quoteId: string }> }

export async function POST(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, quoteId } = await params

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, businessId: id, deletedAt: null },
    include: {
      client: { select: { name: true, email: true } },
      items: true,
      business: { select: { name: true } },
    },
  })

  if (!quote) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (!quote.client?.email) return NextResponse.json({ error: "El cliente no tiene email registrado" }, { status: 400 })

  await sendQuoteEmail({
    clientEmail: quote.client.email,
    clientName: quote.client.name,
    businessName: quote.business.name,
    quoteNumber: quote.number,
    validUntil: quote.validUntil?.toISOString() ?? null,
    items: quote.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
    discount: quote.discount,
    notes: quote.notes,
  })

  return NextResponse.json({ ok: true })
}
