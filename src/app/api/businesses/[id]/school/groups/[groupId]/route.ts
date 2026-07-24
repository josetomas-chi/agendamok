import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; groupId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, groupId } = await params
  const body = await req.json()
  const allowed = ["name","sport","level","days","startTime","endTime","coachId","maxCapacity","monthlyPrice","billingCycle","color","notes","isActive"]
  const data: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) data[k] = body[k] ?? null
  if ("startDate" in body) data.startDate = body.startDate ? new Date(body.startDate + "T00:00:00Z") : null
  if ("endDate" in body) data.endDate = body.endDate ? new Date(body.endDate + "T00:00:00Z") : null

  const group = await prisma.schoolGroup.update({
    where: { id: groupId, businessId: id },
    data,
    include: { coach: { select: { id: true, name: true, color: true } } },
  })
  return NextResponse.json({ group })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, groupId } = await params
  await prisma.schoolGroup.delete({ where: { id: groupId, businessId: id } })
  return NextResponse.json({ ok: true })
}
