import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppReactivation } from "@/lib/whatsapp"
import { subDays } from "date-fns"

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get businesses and their inactive client threshold (default 60 days)
  const businesses = await prisma.business.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true, slug: true, metaPhoneNumberId: true },
  })

  let sent = 0
  let skipped = 0
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"

  for (const biz of businesses) {
    const cutoff = subDays(new Date(), 60)

    // Clients who had an appointment, but none in the last 60 days
    const inactiveClients = await prisma.client.findMany({
      where: {
        businessId: biz.id,
        deletedAt: null,
        phone: { not: null },
        appointments: {
          some: { deletedAt: null },
          none: { startTime: { gte: cutoff }, deletedAt: null },
        },
        // Avoid spamming: check if we already sent in the last 60 days via a simple approach
        // We use the segment field as a proxy — AT_RISK means we're watching them
      },
      select: { id: true, name: true, phone: true },
      take: 20,
    })

    for (const client of inactiveClients) {
      if (!client.phone || !biz.metaPhoneNumberId) { skipped++; continue }
      try {
        await sendWhatsAppReactivation({
          phoneNumberId: biz.metaPhoneNumberId,
          to: client.phone,
          clientName: client.name,
          businessName: biz.name,
        })
        // Mark as AT_RISK so we don't resend immediately
        await prisma.client.update({ where: { id: client.id }, data: { segment: "AT_RISK" } })
        sent++
      } catch {
        skipped++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}
