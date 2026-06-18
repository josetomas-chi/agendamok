import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// GET — load survey data (public, no auth)
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const survey = await prisma.satisfactionSurvey.findUnique({
    where: { token },
    include: {
      appointment: {
        select: {
          startTime: true,
          service: { select: { name: true } },
          staff: { select: { user: { select: { name: true } } } },
        },
      },
      business: { select: { name: true, logo: true } },
    },
  })

  if (!survey) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 })
  if (survey.expiresAt < new Date()) return NextResponse.json({ error: "Encuesta expirada" }, { status: 410 })

  return NextResponse.json({ survey })
}

// POST — submit answer (public, no auth)
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json()

  const schema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
  })

  const data = schema.parse(body)

  const survey = await prisma.satisfactionSurvey.findUnique({ where: { token } })
  if (!survey) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 })
  if (survey.answeredAt) return NextResponse.json({ error: "Ya respondida" }, { status: 409 })
  if (survey.expiresAt < new Date()) return NextResponse.json({ error: "Encuesta expirada" }, { status: 410 })

  await prisma.satisfactionSurvey.update({
    where: { token },
    data: { rating: data.rating, comment: data.comment, answeredAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
