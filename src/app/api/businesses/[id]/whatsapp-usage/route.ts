import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const month = new Date().toISOString().slice(0, 7) // "2026-07"

  const usage = await prisma.whatsAppMonthlyUsage.findUnique({
    where: { businessId_month: { businessId: id, month } },
  })

  const base = 100
  const extra = usage?.extraLimit ?? 0
  return NextResponse.json({
    count: usage?.count ?? 0,
    limit: base + extra,
    extra,
    month,
  })
}
