import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addMinutes, addDays } from "date-fns"
import { sendSurveyRequest } from "@/lib/email"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; apptId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, apptId } = await params

  const body = await req.json()

  // If rescheduling (startTime provided), recalculate endTime from service duration
  if (body.startTime) {
    const existing = await prisma.appointment.findFirst({
      where: { id: apptId, businessId: id, deletedAt: null },
      include: { service: { select: { duration: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 })

    const startTime = new Date(body.startTime)
    body.endTime = addMinutes(startTime, existing.service.duration)
    body.startTime = startTime
  }

  const prevAppt = await prisma.appointment.findUnique({ where: { id: apptId }, select: { status: true } })

  const appointment = await prisma.appointment.update({
    where: { id: apptId },
    data: body,
    include: {
      service: { select: { name: true, color: true, price: true } },
      staff: { select: { id: true, commissionType: true, commissionValue: true, user: { select: { name: true } } } },
      client: { select: { name: true, email: true, phone: true } },
      business: { select: { name: true } },
      payment: { select: { amount: true } },
    },
  })

  // Calculate commission when appointment is marked COMPLETED for the first time
  if (body.status === "COMPLETED" && prevAppt?.status !== "COMPLETED") {
    const existing = await prisma.commissionRecord.findUnique({ where: { appointmentId: apptId } })
    if (!existing && Number(appointment.staff.commissionValue) > 0) {
      const base = appointment.payment
        ? Number(appointment.payment.amount)
        : Number(appointment.service.price)
      const commissionAmount = appointment.staff.commissionType === "PERCENTAGE"
        ? (base * Number(appointment.staff.commissionValue)) / 100
        : Number(appointment.staff.commissionValue)

      if (commissionAmount > 0) {
        await prisma.commissionRecord.create({
          data: {
            businessId: id,
            staffId: appointment.staff.id,
            appointmentId: apptId,
            amount: commissionAmount,
            type: appointment.staff.commissionType,
            rate: appointment.staff.commissionValue,
          },
        })
      }
    }
  }

  // Send satisfaction survey when appointment is marked COMPLETED for the first time
  if (body.status === "COMPLETED" && prevAppt?.status !== "COMPLETED" && appointment.client.email) {
    const existing = await prisma.satisfactionSurvey.findUnique({ where: { appointmentId: apptId } })
    if (!existing) {
      const survey = await prisma.satisfactionSurvey.create({
        data: {
          businessId: id,
          appointmentId: apptId,
          expiresAt: addDays(new Date(), 7),
        },
      })
      const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"
      sendSurveyRequest({
        clientName: appointment.client.name,
        clientEmail: appointment.client.email,
        businessName: appointment.business.name,
        surveyUrl: `${baseUrl}/survey/${survey.token}`,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ appointment })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; apptId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { apptId } = await params

  await prisma.appointment.update({ where: { id: apptId }, data: { deletedAt: new Date(), status: "CANCELLED" } })
  return NextResponse.json({ success: true })
}
