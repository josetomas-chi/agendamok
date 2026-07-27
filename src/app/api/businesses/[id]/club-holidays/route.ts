import { NextResponse } from "next/server"
import { after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { sendHolidaySessionCancelled, sendHolidaySurcharge } from "@/lib/email"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const holidays = await prisma.clubHoliday.findMany({
    where: { businessId: id },
    orderBy: { date: "asc" },
  })
  return NextResponse.json({ holidays })
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const { date, name, type, surchargeType, surchargeValue } = await req.json()
  if (!date || !name || !type) return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })

  const holidayDate = new Date(date)

  const holiday = await prisma.clubHoliday.create({
    data: {
      businessId: id,
      date: holidayDate,
      name,
      type,
      surchargeType: type === "SURCHARGE" ? surchargeType : null,
      surchargeValue: type === "SURCHARGE" ? Number(surchargeValue) : null,
    },
  })

  // Notify affected clients after responding
  after(async () => {
    const dateStart = new Date(holidayDate); dateStart.setUTCHours(0, 0, 0, 0)
    const dateEnd = new Date(holidayDate); dateEnd.setUTCHours(23, 59, 59, 999)

    // Find all court bookings on this date that are active and have a client
    const affected = await prisma.courtBooking.findMany({
      where: {
        businessId: id,
        startTime: { gte: dateStart, lte: dateEnd },
        deletedAt: null,
        status: { not: "CANCELLED" },
        clientId: { not: null },
      },
      include: {
        client: { select: { name: true, email: true } },
        court: { select: { name: true, pricingRules: true } },
      },
    })

    const business = await prisma.business.findUnique({ where: { id }, select: { name: true } })
    if (!business) return

    const dateLabel = format(holidayDate, "EEEE d 'de' MMMM yyyy", { locale: es })

    for (const booking of affected) {
      if (!booking.client?.email) continue

      if (type === "CLOSED") {
        await sendHolidaySessionCancelled({
          clientName: booking.client.name,
          clientEmail: booking.client.email,
          businessName: business.name,
          courtName: booking.court.name,
          date: dateLabel,
          holidayName: name,
        })
      } else if (type === "SURCHARGE") {
        const sv = Number(surchargeValue)
        const original = Number(booking.price)
        const newPrice = surchargeType === "PERCENT"
          ? Math.round(original * (1 + sv / 100))
          : original + sv

        await sendHolidaySurcharge({
          clientName: booking.client.name,
          clientEmail: booking.client.email,
          businessName: business.name,
          courtName: booking.court.name,
          date: dateLabel,
          holidayName: name,
          originalPrice: original,
          newPrice,
          surchargeType,
          surchargeValue: sv,
        })
      }
    }
  })

  return NextResponse.json({ holiday }, { status: 201 })
}
