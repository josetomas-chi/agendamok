import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { businessOwner: { select: { name: true } } },
  })

  return NextResponse.json({ users })
}
