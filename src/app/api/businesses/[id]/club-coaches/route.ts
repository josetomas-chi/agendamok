import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const coaches = await prisma.clubCoach.findMany({
    where: { businessId: id },
    include: { feeRules: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json({ coaches })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { name, email, phone, photo, color, paymentType, commissionPercent, feeRules } = body

  if (!name || !paymentType) return NextResponse.json({ error: "Faltan campos" }, { status: 400 })

  const coach = await prisma.clubCoach.create({
    data: {
      businessId: id,
      name,
      email: email || null,
      phone: phone || null,
      photo: photo || null,
      color: color || "#38bdf8",
      paymentType,
      commissionPercent: paymentType === "COMMISSION" ? (commissionPercent ?? null) : null,
      feeRules: feeRules?.length
        ? { create: feeRules.map((r: { name: string; days: number[]; startTime: string; endTime: string; price: number }) => ({
            name: r.name,
            days: r.days,
            startTime: r.startTime,
            endTime: r.endTime,
            price: r.price,
          })) }
        : undefined,
    },
    include: { feeRules: true },
  })
  return NextResponse.json({ coach }, { status: 201 })
}
