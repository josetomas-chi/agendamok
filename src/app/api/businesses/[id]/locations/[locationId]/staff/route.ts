import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; locationId: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, locationId } = await params

  const location = await prisma.location.findFirst({
    where: { id: locationId, businessId: id, deletedAt: null },
    include: {
      staff: {
        include: { user: { select: { name: true, image: true } } },
      },
    },
  })

  if (!location) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const allStaff = await prisma.staffMember.findMany({
    where: { businessId: id, isActive: true },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { user: { name: "asc" } },
  })

  return NextResponse.json({ assigned: location.staff, all: allStaff })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { locationId } = await params

  const { staffIds } = await req.json()

  await prisma.location.update({
    where: { id: locationId },
    data: { staff: { set: staffIds.map((sid: string) => ({ id: sid })) } },
  })

  return NextResponse.json({ success: true })
}
