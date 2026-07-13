import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const subs = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      business: { include: { owner: { select: { name: true, email: true } } } },
    },
  })
  return NextResponse.json({ subs })
}
