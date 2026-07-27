import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMpAuthUrl } from "@/lib/mercadopago"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const business = await prisma.business.findFirst({
    where: { owner: { email: session.user.email } },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  const url = getMpAuthUrl(business.id)
  return NextResponse.redirect(url)
}
