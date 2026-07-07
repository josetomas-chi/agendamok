import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; holidayId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, holidayId } = await params
  const { date, name, type, surchargeType, surchargeValue } = await req.json()
  const holiday = await prisma.clubHoliday.update({
    where: { id: holidayId, businessId: id },
    data: {
      ...(date && { date: new Date(date) }),
      ...(name && { name }),
      ...(type && { type }),
      surchargeType: type === "SURCHARGE" ? surchargeType : null,
      surchargeValue: type === "SURCHARGE" ? Number(surchargeValue) : null,
    },
  })
  return NextResponse.json({ holiday })
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, holidayId } = await params
  await prisma.clubHoliday.delete({ where: { id: holidayId, businessId: id } })
  return NextResponse.json({ success: true })
}
