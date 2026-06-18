import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  await params

  const { appointmentId, method, amount } = await req.json()

  const payment = await prisma.payment.upsert({
    where: { appointmentId },
    update: { method, status: "PAID", paidAt: new Date(), amount },
    create: { appointmentId, method, status: "PAID", paidAt: new Date(), amount, currency: "CLP" },
  })

  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED" } })

  return NextResponse.json({ payment }, { status: 201 })
}
