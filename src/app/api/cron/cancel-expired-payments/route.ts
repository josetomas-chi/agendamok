import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendCourtBookingCancellation } from "@/lib/email"

const PAYMENT_TIMEOUT_MINUTES = 10

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000)

  // Find PENDING court bookings that were not paid within the timeout window
  const expired = await prisma.courtBooking.findMany({
    where: {
      status: "PENDING",
      paidOnline: false,
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
    include: {
      client: { select: { name: true, email: true } },
      court: { select: { name: true } },
      business: { select: { name: true } },
    },
  })

  let cancelled = 0
  for (const booking of expired) {
    await prisma.courtBooking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    })
    await prisma.courtBookingLog.create({
      data: {
        bookingId: booking.id,
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
        source: "cron",
        meta: JSON.stringify({ reason: "payment_timeout", timeoutMinutes: PAYMENT_TIMEOUT_MINUTES }),
      },
    })
    if (booking.client?.email) {
      sendCourtBookingCancellation({
        clientName: booking.client.name,
        clientEmail: booking.client.email,
        businessName: booking.business.name,
        courtName: booking.court.name,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
      }).catch(() => {})
    }
    cancelled++
  }

  return NextResponse.json({ ok: true, cancelled, checked: expired.length })
}
