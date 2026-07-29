import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAdminNotification } from "@/lib/email"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: businessId } = await params

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, ownerId: true },
  })
  if (!business || business.ownerId !== session.user.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const body = await req.json()
  const { subject, message, recipients } = body as {
    subject: string
    message: string
    recipients: { name: string; email: string }[]
  }

  if (!subject?.trim()) return NextResponse.json({ error: "Asunto requerido" }, { status: 400 })
  if (!message?.trim()) return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 })
  if (!Array.isArray(recipients) || recipients.length === 0)
    return NextResponse.json({ error: "Sin destinatarios" }, { status: 400 })

  const result = await sendAdminNotification({
    recipients,
    subject: subject.trim(),
    message: message.trim(),
    businessName: business.name,
  })

  return NextResponse.json(result)
}
