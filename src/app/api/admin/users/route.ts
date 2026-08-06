import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const includeDeleted = new URL(req.url).searchParams.get("includeDeleted") === "true"

  const users = await prisma.user.findMany({
    where: includeDeleted ? {} : { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { businessOwner: { select: { name: true } } },
  })

  return NextResponse.json({ users })
}
