import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const settings = await prisma.clubSettings.findUnique({ where: { businessId: id } })
  return NextResponse.json({ settings })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const settings = await prisma.clubSettings.upsert({
    where: { businessId: id },
    update: {
      clubName: body.clubName || null,
      description: body.description || null,
      address: body.address || null,
      phone: body.phone || null,
      website: body.website || null,
      openDays: body.openDays ?? [1, 2, 3, 4, 5, 6],
      openTime: body.openTime || "08:00",
      closeTime: body.closeTime || "22:00",
      slotMinutes: Number(body.slotMinutes) || 60,
      bookingWindowDays: Number(body.bookingWindowDays) || 30,
    },
    create: {
      businessId: id,
      clubName: body.clubName || null,
      description: body.description || null,
      address: body.address || null,
      phone: body.phone || null,
      website: body.website || null,
      openDays: body.openDays ?? [1, 2, 3, 4, 5, 6],
      openTime: body.openTime || "08:00",
      closeTime: body.closeTime || "22:00",
      slotMinutes: Number(body.slotMinutes) || 60,
      bookingWindowDays: Number(body.bookingWindowDays) || 30,
    },
  })
  return NextResponse.json({ settings })
}
