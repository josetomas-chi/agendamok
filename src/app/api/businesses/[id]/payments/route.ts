import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id: businessId } = await params

  const { appointmentId, method, amount } = await req.json()

  const payment = await prisma.payment.upsert({
    where: { appointmentId },
    update: { method, status: "PAID", paidAt: new Date(), amount },
    create: { appointmentId, method, status: "PAID", paidAt: new Date(), amount, currency: "CLP" },
  })

  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED" } })

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
