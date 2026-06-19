import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppReminder } from "@/lib/whatsapp"
import { sendBookingReminder } from "@/lib/email"
import { utcToChileLocal } from "@/lib/timezone"
import { format, addHours } from "date-fns"
import { es } from "date-fns/locale"

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const windowStart = addHours(now, 1)
  const windowEnd = addHours(now, 1.5)

  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: windowStart, lte: windowEnd },
      status: { in: ["CONFIRMED", "PENDING"] },
      deletedAt: null,
      whatsappReminder1hSentAt: null,
    },
    include: {
      client: { select: { name: true, phone: true, email: true } },
      service: { select: { name: true } },
      business: { select: { name: true } },
    },
  })

  let sent = 0
  let skipped = 0

  for (const appt of appointments) {
    const local = utcToChileLocal(appt.startTime)
    const date = format(local, "EEEE d 'de' MMMM", { locale: es })
    const time = format(local, "HH:mm")

    try {
      if (appt.client.phone) {
        await sendWhatsAppReminder({
          to: appt.client.phone,
          clientName: appt.client.name,
          businessName: appt.business.name,
          serviceName: appt.service.name,
          date,
          time,
        })
      }

      if (appt.client.email) {
        await sendBookingReminder({
          clientName: appt.client.name,
          clientEmail: appt.client.email,
          businessName: appt.business.name,
          serviceName: appt.service.name,
          date,
          time,
        })
      }

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { whatsappReminder1hSentAt: new Date(), emailReminder1hSentAt: new Date() },
      })
      sent++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}
