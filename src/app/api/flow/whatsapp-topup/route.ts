import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createPaymentLink } from "@/lib/flow"

const TOPUP_CONVERSATIONS = 50
// 0,1 UF ≈ 3700 CLP (Flow requires CLP integer)
const TOPUP_PRICE_CLP = 3700

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { businessOwner: { select: { id: true, name: true } } },
  })
  if (!user?.businessOwner) return NextResponse.json({ error: "Sin negocio" }, { status: 400 })

  const business = user.businessOwner
  const commerceOrder = `wa-topup-${business.id}-${Date.now()}`
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.cl"

  const result = await createPaymentLink({
    commerceOrder,
    subject: `AgendaMok — 50 conversaciones WhatsApp adicionales`,
    amount: TOPUP_PRICE_CLP,
    email: user.email!,
    urlReturn: `${baseUrl}/dashboard/settings?tab=integrations&wa_topup=ok`,
    urlConfirmation: `${baseUrl}/api/flow/whatsapp-topup/confirm`,
  })

  if (!result?.url || !result?.token) {
    return NextResponse.json({ error: "Error al crear pago" }, { status: 502 })
  }

  return NextResponse.json({ url: result.url + "?token=" + result.token })
}
