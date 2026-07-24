import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get("groupId")
  const date = searchParams.get("date") // "YYYY-MM-DD"

  const classes = await prisma.schoolClass.findMany({
    where: {
      businessId: id,
      ...(groupId && { groupId }),
      ...(date && { date: new Date(date + "T00:00:00Z") }),
    },
    include: {
      group: { select: { id: true, name: true, color: true, maxCapacity: true } },
      coach: { select: { id: true, name: true } },
      attendance: { include: { client: { select: { id: true, name: true } } } },
    },
    orderBy: { date: "desc" },
  })
  return NextResponse.json({ classes })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { groupId, date, coachId, notes } = await req.json()

  const dateUTC = new Date(date + "T00:00:00Z")

  // upsert — avoid duplicates
  const existing = await prisma.schoolClass.findUnique({ where: { groupId_date: { groupId, date: dateUTC } } })
  if (existing) return NextResponse.json({ schoolClass: existing })

  // Pre-populate attendance from active enrollments
  const enrollments = await prisma.schoolEnrollment.findMany({
    where: { groupId, status: "ACTIVE" },
    select: { clientId: true },
  })

  const schoolClass = await prisma.schoolClass.create({
    data: {
      businessId: id, groupId, date: dateUTC,
      coachId: coachId || null,
      notes: notes || null,
      attendance: {
        create: enrollments.map(e => ({ clientId: e.clientId, present: true })),
      },
    },
    include: {
      group: { select: { id: true, name: true, color: true, maxCapacity: true } },
      coach: { select: { id: true, name: true } },
      attendance: { include: { client: { select: { id: true, name: true } } } },
    },
  })
  return NextResponse.json({ schoolClass }, { status: 201 })
}
