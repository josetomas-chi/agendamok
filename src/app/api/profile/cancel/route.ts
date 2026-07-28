import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { businessRefundPayment } from "@/lib/flow"
import { refundMpPayment } from "@/lib/mercadopago"
import { sendCancellationRefundEmail } from "@/lib/email"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type RefundChoice = "refund" | "credit"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { type, id, refundChoice } = await req.json() as {
    type: "court" | "appt"
    id: string
    refundChoice?: RefundChoice
  }
  if (!type || !id) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })

  const userId = session.user.id
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  // Auto-link orphan clients before looking up booking (same logic as profile GET)
  if (userRecord?.email) {
    const orphans = await prisma.client.findMany({
      where: { email: userRecord.email, userId: null, deletedAt: null },
      select: { id: true },
    })
    for (const o of orphans) {
      try { await prisma.client.update({ where: { id: o.id }, data: { userId } }) } catch { /* skip */ }
    }
  }

  const clients = await prisma.client.findMany({
    where: { userId, deletedAt: null },
    select: { id: true },
  })
  const clientIds = clients.map(c => c.id)

  if (type === "court") {
    const booking = await prisma.courtBooking.findFirst({
      where: { id, clientId: { in: clientIds }, deletedAt: null },
      select: {
        id: true, startTime: true, status: true, paidOnline: true,
        paidAmount: true, mpPaymentId: true, clientId: true,
        business: {
          select: {
            name: true, slug: true,
            cancellationHoursNotice: true,
            flowApiKey: true, flowSecretKey: true,
            mpAccessToken: true,
          },
        },
        payment: {
          select: { id: true, flowToken: true, mpPaymentId: true, method: true, amount: true, status: true },
        },
      },
    })

    if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
    if (booking.status === "CANCELLED") return NextResponse.json({ error: "Ya cancelada" }, { status: 400 })

    // Check cancellation policy
    const hoursNotice = booking.business.cancellationHoursNotice ?? 0
    if (hoursNotice > 0) {
      const hoursUntil = (new Date(booking.startTime).getTime() - Date.now()) / 3_600_000
      if (hoursUntil < hoursNotice) {
        return NextResponse.json(
          { error: `Fuera del período de cancelación (se requieren ${hoursNotice}h de anticipación)` },
          { status: 422 }
        )
      }
    }

    const payment = booking.payment
    const paidAmount = Number(booking.paidAmount)
    let refundResult: "refunded" | "credited" | "none" = "none"

    if (paidAmount > 0 && payment && payment.status !== "REFUNDED") {
      const choice = refundChoice ?? "refund"

      if (choice === "credit" && booking.clientId) {
        // Abono a cuenta del cliente
        await prisma.client.update({
          where: { id: booking.clientId },
          data: { creditBalance: { increment: Math.round(paidAmount * 100) } },
        })
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } })
        refundResult = "credited"
      } else if (choice === "refund") {
        // Flow refund
        if (payment.flowToken && booking.business.flowApiKey && booking.business.flowSecretKey) {
          try {
            await businessRefundPayment(
              booking.business.flowApiKey,
              booking.business.flowSecretKey,
              payment.flowToken,
              paidAmount
            )
            await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } })
            refundResult = "refunded"
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Error Flow"
            return NextResponse.json({ error: `Error al reembolsar via Flow: ${msg}` }, { status: 502 })
          }
        }
        // MercadoPago refund
        else if ((payment.mpPaymentId || booking.mpPaymentId) && booking.business.mpAccessToken) {
          const mpId = payment.mpPaymentId ?? booking.mpPaymentId!
          try {
            await refundMpPayment(mpId, booking.business.mpAccessToken, paidAmount)
            await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } })
            refundResult = "refunded"
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Error MP"
            return NextResponse.json({ error: `Error al reembolsar via MercadoPago: ${msg}` }, { status: 502 })
          }
        }
        // Transfer — can only credit, not auto-refund
        else if (booking.clientId) {
          await prisma.client.update({
            where: { id: booking.clientId },
            data: { creditBalance: { increment: Math.round(paidAmount * 100) } },
          })
          await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } })
          refundResult = "credited"
        }
      }
    }

    await prisma.courtBooking.update({ where: { id }, data: { status: "CANCELLED" } })

    // Send confirmation email
    if (userRecord?.email) {
      const APP_URL = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://agendamok.cl"
      sendCancellationRefundEmail({
        clientName: userRecord.name ?? "Cliente",
        clientEmail: userRecord.email,
        businessName: booking.business.name ?? "el club",
        bookingName: `Cancha — ${format(new Date(booking.startTime), "EEEE d 'de' MMMM", { locale: es })}`,
        date: format(new Date(booking.startTime), "EEEE d 'de' MMMM yyyy", { locale: es }),
        time: format(new Date(booking.startTime), "HH:mm"),
        amount: paidAmount,
        refundResult,
        bookingUrl: `${APP_URL}/book/${booking.business.slug}`,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, refundResult, amount: paidAmount })
  }

  if (type === "appt") {
    const appt = await prisma.appointment.findFirst({
      where: { id, clientId: { in: clientIds }, deletedAt: null },
      select: {
        id: true, startTime: true, status: true, clientId: true,
        business: { select: { name: true, slug: true, cancellationHoursNotice: true } },
        payment: {
          select: { id: true, flowToken: true, mpPaymentId: true, method: true, amount: true, status: true },
        },
      },
    })

    if (!appt) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })
    if (appt.status === "CANCELLED") return NextResponse.json({ error: "Ya cancelado" }, { status: 400 })

    const hoursNotice = appt.business.cancellationHoursNotice ?? 0
    if (hoursNotice > 0) {
      const hoursUntil = (new Date(appt.startTime).getTime() - Date.now()) / 3_600_000
      if (hoursUntil < hoursNotice) {
        return NextResponse.json(
          { error: `Fuera del período de cancelación (se requieren ${hoursNotice}h de anticipación)` },
          { status: 422 }
        )
      }
    }

    await prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } })

    if (userRecord?.email) {
      const APP_URL = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://agendamok.cl"
      sendCancellationRefundEmail({
        clientName: userRecord.name ?? "Cliente",
        clientEmail: userRecord.email,
        businessName: appt.business.name ?? "el negocio",
        bookingName: `Turno — ${format(new Date(appt.startTime), "EEEE d 'de' MMMM", { locale: es })}`,
        date: format(new Date(appt.startTime), "EEEE d 'de' MMMM yyyy", { locale: es }),
        time: format(new Date(appt.startTime), "HH:mm"),
        amount: 0,
        refundResult: "none",
        bookingUrl: `${APP_URL}/book/${appt.business.slug}`,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, refundResult: "none", amount: 0 })
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
}
