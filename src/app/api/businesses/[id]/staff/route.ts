import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialty: z.string().optional(),
  color: z.string().default("#8b5cf6"),
  commissionType: z.enum(["PERCENTAGE", "FLAT"]).default("PERCENTAGE"),
  commissionValue: z.number().min(0).default(0),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const staff = await prisma.staffMember.findMany({
    where: { businessId: id, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, phone: true } },
      schedules: { orderBy: { dayOfWeek: "asc" } },
      services: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ staff })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    const { name, email, phone, bio, specialty, color, commissionType, commissionValue } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })

    let userId: string
    if (existing) {
      const alreadyStaff = await prisma.staffMember.findFirst({
        where: { userId: existing.id, businessId: id, deletedAt: null },
      })
      if (alreadyStaff) {
        return NextResponse.json({ error: "Este usuario ya es parte del equipo" }, { status: 400 })
      }
      userId = existing.id
    } else {
      const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(2) + "Ap!", 10)
      const newUser = await prisma.user.create({
        data: { name, email, phone, password: tempPassword, role: "STAFF" },
      })
      userId = newUser.id
    }

    const staffMember = await prisma.staffMember.create({
      data: {
        userId,
        businessId: id,
        bio,
        specialty,
        color,
        commissionType,
        commissionValue,
        schedules: {
          createMany: {
            data: [1, 2, 3, 4, 5].map((day) => ({
              dayOfWeek: day,
              startTime: "09:00",
              endTime: "18:00",
              isWorking: true,
            })),
          },
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        schedules: true,
      },
    })

    return NextResponse.json({ staff: staffMember }, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
