import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; coachId: string }> }

// GET /api/businesses/[id]/club-coaches/[coachId]/report?year=2026&month=7
// Retorna sesiones del mes con cálculo de comisión o pago al club
export async function GET(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, coachId } = await params

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") ?? String(new Date().getUTCFullYear()))
  const month = parseInt(searchParams.get("month") ?? String(new Date().getUTCMonth() + 1))

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))

  const coach = await prisma.clubCoach.findFirst({
    where: { id: coachId, businessId: id },
    include: { feeRules: true },
  })
  if (!coach) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const bookings = await prisma.courtBooking.findMany({
    where: {
      coachId,
      businessId: id,
      deletedAt: null,
      status: { not: "CANCELLED" },
      startTime: { gte: start, lt: end },
    },
    include: { court: true, client: true },
    orderBy: { startTime: "asc" },
  })

  // Calcular resumen por sesión
  type BookingRow = typeof bookings[0]
  const sessions = bookings.map((b: BookingRow) => {
    const durationMinutes = (b.endTime.getTime() - b.startTime.getTime()) / 60000
    const durationHours = durationMinutes / 60
    const price = Number(b.price)

    let coachEarns = 0
    let coachPays = 0
    let clubEarns = 0

    const h = b.startTime.getUTCHours()
    const m = b.startTime.getUTCMinutes()
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    const dow = b.startTime.getUTCDay()
    const rule = coach.feeRules.find(
      (r: { days: number[]; startTime: string; endTime: string }) => r.days.includes(dow) && timeStr >= r.startTime && timeStr < r.endTime
    )

    if (coach.paymentType === "COMMISSION") {
      // Coach recibe su % del precio de la clase; el club se queda con el resto
      const pct = coach.commissionPercent ?? 0
      coachEarns = price * (pct / 100)
      clubEarns = price - coachEarns
    } else {
      // COURT_FEE: el club cobra arriendo fijo; el coach se queda con el resto
      coachPays = rule ? Number(rule.price) * durationHours : 0
      clubEarns = coachPays
      coachEarns = price - coachPays
    }

    return {
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      durationMinutes,
      courtName: b.court?.name ?? "",
      clientName: b.client ? `${b.client.firstName} ${b.client.lastName}` : null,
      price,
      status: b.status,
      coachEarns,
      coachPays,
      clubEarns,
    }
  })

  const totalSessions = sessions.length
  type Sess = typeof sessions[0]
  const totalHours = sessions.reduce((s: number, b: Sess) => s + b.durationMinutes / 60, 0)
  const totalRevenue = sessions.reduce((s: number, b: Sess) => s + b.price, 0)
  const totalCoachEarns = sessions.reduce((s: number, b: Sess) => s + b.coachEarns, 0)
  const totalCoachPays = sessions.reduce((s: number, b: Sess) => s + b.coachPays, 0)
  const totalClubEarns = sessions.reduce((s: number, b: Sess) => s + b.clubEarns, 0)

  return NextResponse.json({
    coach: { id: coach.id, name: coach.name, paymentType: coach.paymentType, commissionPercent: coach.commissionPercent, color: coach.color },
    period: { year, month },
    summary: { totalSessions, totalHours, totalRevenue, totalCoachEarns, totalCoachPays, totalClubEarns },
    sessions,
  })
}
