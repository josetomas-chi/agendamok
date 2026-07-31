import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { businessId } = await req.json()

  // Verify the user actually has access to this business
  const owned = await prisma.business.findUnique({
    where: { id: businessId, ownerId: session.user.id },
    select: { id: true },
  })
  const member = !owned ? await prisma.businessMember.findFirst({
    where: { businessId, userId: session.user.id, acceptedAt: { not: null } },
    select: { id: true },
  }) : null

  if (!owned && !member) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.set("active-business-id", businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  return NextResponse.json({ ok: true })
}
