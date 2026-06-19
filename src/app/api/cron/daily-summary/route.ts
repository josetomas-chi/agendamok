import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendDailySummary } from "@/lib/email"
import { utcToChileLocal } from "@/lib/timezone"
import { format, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date()
  const start = startOfDay(today)
  const end = endOfDay(today)

  const businesses = await prisma.business.findMany({
    where: { isActive: true, dailySummaryEnabled: true, deletedAt: null },
    select: {
      name: true,
      owner: { select: { name: true, email: true } },
      appointments: {
        where: {
          startTime: { gte: start, lte: end },
          status: { in: ["CONFIRMED", "PENDING"] },
          deletedAt: null,
        },
        orderBy: { startTime: "asc" },
        include: {
          client: { select: { name: true } },
          service: { select: { name: true } },
          staff: { select: { user: { select: { name: true } } } },
        },
      },
    },
  })

  let sent = 0
  for (const biz of businesses) {
    if (!biz.owner?.email) continue
    try {
      await sendDailySummary({
        ownerEmail: biz.owner.email,
        ownerName: biz.owner.name || "Hola",
        businessName: biz.name,
        date: format(today, "EEEE d 'de' MMMM", { locale: es }),
        appointments: biz.appointments.map(a => ({
          time: format(utcToChileLocal(a.startTime), "HH:mm"),
          clientName: a.client.name,
          serviceName: a.service.name,
          staffName: a.staff?.user.name || "Sin asignar",
        })),
      })
      sent++
    } catch { /* skip */ }
  }

  return NextResponse.json({ ok: true, sent })
}
