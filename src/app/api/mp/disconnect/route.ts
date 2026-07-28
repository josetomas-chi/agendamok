import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("businessId")

  const business = await prisma.business.findFirst({
    where: businessId
      ? { id: businessId, owner: { email: session.user.email } }
      : { owner: { email: session.user.email } },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

  await prisma.business.update({
    where: { id: business.id },
    data: {
      mpAccessToken: null,
      mpRefreshToken: null,
      mpPublicKey: null,
      mpUserId: null,
      mpConnected: false,
    },
  })

  return NextResponse.json({ ok: true })
}
