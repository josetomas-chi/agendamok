import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const holidays = await prisma.clubHoliday.findMany({
    where: { businessId: id },
    orderBy: { date: "asc" },
  })
  return NextResponse.json({ holidays })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { date, name, type, surchargeType, surchargeValue } = await req.json()
  if (!date || !name || !type) return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  const holiday = await prisma.clubHoliday.create({
    data: {
      businessId: id,
      date: new Date(date),
      name,
      type,
      surchargeType: type === "SURCHARGE" ? surchargeType : null,
      surchargeValue: type === "SURCHARGE" ? Number(surchargeValue) : null,
    },
  })
  return NextResponse.json({ holiday }, { status: 201 })
}
