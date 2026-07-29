import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBookingConfirmation } from "@/lib/email"
import { utcToChileLocal } from "@/lib/timezone"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id: businessId } = await params

  // Verify the operator belongs to this business
  const isMember = await prisma.business.findFirst({
    where: {
      id: businessId,
      OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }],
    },
    select: { id: true, name: true, owner: { select: { name: true, email: true } } },
  })
  if (!isMember) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { appointmentId, method, amount } = await req.json()

  // Verify the appointment belongs to this business (IDOR prevention)
  const existingAppt = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    include: {
      client: true,
      service: { select: { name: true, duration: true } },
      staff: { include: { user: { select: { name: true } } } },
    },
  })
  if (!existingAppt) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })

  const payment = await prisma.payment.upsert({
    where: { appointmentId },
    update: { method, status: "PAID", paidAt: new Date(), amount },
    create: { appointmentId, businessId, method, status: "PAID", paidAt: new Date(), amount, currency: "CLP" },
  })

  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED" } })

  // Send receipt to client
  if (existingAppt.client.email) {
    const localApptStart = utcToChileLocal(existingAppt.startTime)
    const dateStr = localApptStart.toLocaleDateString("es-CL")
    const timeStr = localApptStart.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
    sendBookingConfirmation({
      clientName: existingAppt.client.name,
      clientEmail: existingAppt.client.email,
      businessName: isMember.name,
      serviceName: existingAppt.service.name,
      staffName: existingAppt.staff?.user.name || "",
      date: dateStr,
      time: timeStr,
      duration: existingAppt.service.duration,
      startTimeISO: existingAppt.startTime.toISOString(),
    }).catch(() => {})
  }

  // Create commission record if staff has a commission configured
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { staff: { select: { id: true, commissionType: true, commissionValue: true } } },
  })
  if (appt?.staff && Number(appt.staff.commissionValue) > 0) {
    const rate = Number(appt.staff.commissionValue)
    const commAmount = appt.staff.commissionType === "PERCENTAGE"
      ? (Number(amount) * rate) / 100
      : rate
    await prisma.commissionRecord.upsert({
      where: { appointmentId },
      update: { amount: commAmount, rate, type: appt.staff.commissionType as "PERCENTAGE" | "FIXED" },
      create: {
        businessId,
        staffId: appt.staff.id,
        appointmentId,
        amount: commAmount,
        rate,
        type: appt.staff.commissionType as "PERCENTAGE" | "FIXED",
      },
    })
  }

  return NextResponse.json({ payment }, { status: 201 })
}
