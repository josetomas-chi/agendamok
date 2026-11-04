import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const coach = await prisma.clubCoach.findUnique({
    where: { userId: session.user.id },
    include: {
      business: { select: { id: true, name: true, logo: true } },
      feeRules: true,
    },
  })
  if (!coach) return NextResponse.json({ error: "No eres coach" }, { status: 404 })

  const { from, to } = Object.fromEntries(new URL(req.url).searchParams)
  const start = from ? new Date(from) : (() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d })()
  const end = to ? new Date(to) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [bookings, schoolGroups] = await Promise.all([
    prisma.courtBooking.findMany({
      where: {
        coachId: coach.id,
        deletedAt: null,
        status: { not: "CANCELLED" },
        startTime: { gte: start, lt: end },
      },
      include: {
        court: { select: { id: true, name: true, color: true, sport: true } },
        client: { select: { id: true, name: true, lastName: true, phone: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.schoolGroup.findMany({
      where: { coachId: coach.id, businessId: coach.businessId },
      include: {
        classes: {
          where: { scheduledAt: { gte: start, lt: end } },
          include: {
            attendance: { select: { id: true, enrollmentId: true, present: true } },
          },
          orderBy: { scheduledAt: "asc" },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          include: { client: { select: { id: true, name: true, lastName: true, phone: true } } },
        },
      },
    }),
  ])

  // Calcular ganancias del período
  const completedBookings = bookings.filter((b: typeof bookings[0]) => b.status === "COMPLETED")
  let earnings = 0
  for (const b of completedBookings) {
    if (coach.paymentType === "COMMISSION" && coach.commissionPercent) {
      earnings += Number(b.price) * (coach.commissionPercent / 100)
    } else if (coach.paymentType === "COURT_FEE") {
      // coach cobra el precio de clase completo al cliente, ya incluido en price
      earnings += Number(b.price)
    }
  }

  return NextResponse.json({ coach, bookings, schoolGroups, earnings })
}
