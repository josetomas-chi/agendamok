import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getOAuthUrl } from "@/lib/google-calendar"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id }, select: { id: true } })
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 })

  const url = getOAuthUrl(business.id)
  return NextResponse.redirect(url)
}
