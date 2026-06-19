import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppReminder } from "@/lib/whatsapp"
import { utcToChileLocal } from "@/lib/timezone"
import { format, startOfDay, endOfDay, addDays } from "date-fns"
import { es } from "date-fns/locale"

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find appointments tomorrow that haven't been reminded
  const tomorrow = addDays(new Date(), 1)
  const start = startOfDay(tomorrow)
  const end = endOfDay(tomorrow)

  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: start, lte: end },
      status: { in: ["CONFIRMED", "PENDING"] },
      deletedAt: null,
      whatsappReminderSentAt: null,
    },
    include: {
      client: { select: { name: true, phone: true } },
      service: { select: { name: true } },
      business: { select: { name: true } },
    },
  })

  let sent = 0
  let skipped = 0

  for (const appt of appointments) {
    if (!appt.client.phone) { skipped++; continue }

    const local = utcToChileLocal(appt.startTime)
    try {
      await sendWhatsAppReminder({
        to: appt.client.phone,
        clientName: appt.client.name,
        businessName: appt.business.name,
        serviceName: appt.service.name,
        date: format(local, "EEEE d 'de' MMMM", { locale: es }),
        time: format(local, "HH:mm"),
      })

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { whatsappReminderSentAt: new Date() },
      })

      sent++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}
