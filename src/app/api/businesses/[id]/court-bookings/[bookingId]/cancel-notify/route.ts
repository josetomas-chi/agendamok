import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendCancellationRefundEmail } from "@/lib/email"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Params = { params: Promise<{ id: string; bookingId: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id, bookingId } = await params
  const { refundResult, amount } = await req.json()

  const booking = await prisma.courtBooking.findUnique({
    where: { id: bookingId, businessId: id },
    include: {
      court: { select: { name: true } },
      client: { select: { name: true, email: true } },
      business: { select: { name: true } },
    },
  })

  if (!booking?.client?.email) return NextResponse.json({ ok: false })

  await sendCancellationRefundEmail({
    clientName: booking.client.name,
    clientEmail: booking.client.email,
    businessName: booking.business?.name ?? "el club",
    bookingName: `Cancha ${booking.court.name}`,
    date: format(new Date(booking.startTime), "EEEE d 'de' MMMM yyyy", { locale: es }),
    time: format(new Date(booking.startTime), "HH:mm"),
    amount: amount ?? 0,
    refundResult: refundResult ?? "none",
  })

  return NextResponse.json({ ok: true })
}
