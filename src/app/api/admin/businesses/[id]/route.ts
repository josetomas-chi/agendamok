import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  if (typeof body.isActive === "boolean") {
    await prisma.business.update({
      where: { id },
      data: { isActive: body.isActive },
    })
  }

  if (body.plan) {
    const existing = await prisma.subscription.findFirst({ where: { businessId: id } })
    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { plan: body.plan },
      })
    } else {
      await prisma.subscription.create({
        data: { businessId: id, plan: body.plan, status: "ACTIVE" },
      })
    }
  }

  return NextResponse.json({ success: true })
}
