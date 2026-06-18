import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  type: z.enum(["BLOCKED", "CAPACITY_OVERRIDE"]),
  capacity: z.number().int().min(1).optional(),
  reason: z.string().optional(),
})

type Params = { params: Promise<{ id: string; staffId: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, staffId } = await params

  const exceptions = await prisma.availabilityException.findMany({
    where: { businessId: id, staffId },
    orderBy: { date: "asc" },
  })
  return NextResponse.json({ exceptions })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, staffId } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const exception = await prisma.availabilityException.create({
      data: {
        businessId: id,
        staffId,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
        capacity: data.capacity,
        reason: data.reason,
      },
    })
    return NextResponse.json({ exception }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
