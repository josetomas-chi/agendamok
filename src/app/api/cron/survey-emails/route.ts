import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendSurveyRequest } from "@/lib/email"
import { subHours } from "date-fns"

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Turnos completados hace entre 1h y 2h sin encuesta creada
  const now = new Date()
  const windowEnd = subHours(now, 1)
  const windowStart = subHours(now, 2)

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "COMPLETED",
      deletedAt: null,
      endTime: { gte: windowStart, lte: windowEnd },
      survey: null,
      client: { email: { not: null } },
    },
    include: {
      client: { select: { name: true, email: true } },
      service: { select: { name: true } },
      business: { select: { id: true, name: true } },
    },
  })

  let sent = 0
  let skipped = 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.cl"

  for (const appt of appointments) {
    if (!appt.client.email) { skipped++; continue }
    try {
      const survey = await prisma.satisfactionSurvey.create({
        data: {
          businessId: appt.business.id,
          appointmentId: appt.id,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      await sendSurveyRequest({
        clientName: appt.client.name,
        clientEmail: appt.client.email,
        businessName: appt.business.name,
        surveyUrl: `${appUrl}/survey/${survey.token}`,
      })

      sent++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}
