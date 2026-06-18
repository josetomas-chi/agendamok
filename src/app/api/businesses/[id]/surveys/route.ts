import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const surveys = await prisma.satisfactionSurvey.findMany({
    where: {
      businessId: id,
      answeredAt: { not: null },
      ...(from && to && { answeredAt: { gte: new Date(from), lte: new Date(to) } }),
    },
    include: {
      appointment: {
        select: {
          startTime: true,
          service: { select: { name: true } },
          staff: { select: { id: true, color: true, user: { select: { name: true } } } },
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { answeredAt: "desc" },
  })

  type S = typeof surveys[number]
  const answered = surveys.filter((s: S) => s.rating !== null)
  const avg = answered.length > 0
    ? answered.reduce((sum: number, s: S) => sum + (s.rating ?? 0), 0) / answered.length
    : null

  const byRating = [1, 2, 3, 4, 5].map(r => ({
    rating: r,
    count: answered.filter((s: S) => s.rating === r).length,
  }))

  return NextResponse.json({ surveys, avg, byRating, total: answered.length })
}
