import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  if (typeof body.isActive === "boolean") {
    await prisma.business.update({
      where: { id },
      data: { isActive: body.isActive },
    })
  }

  if (body.type) {
    await prisma.business.update({ where: { id }, data: { businessType: body.type } })
  }

  if (body.plan || body.status) {
    const existing = await prisma.subscription.findFirst({ where: { businessId: id } })
    const updateData: Record<string, unknown> = {}
    if (body.plan) updateData.plan = body.plan
    if (body.status) {
      updateData.status = body.status
      if (body.status === "ACTIVE") {
        updateData.currentPeriodStart = new Date()
        updateData.currentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    }
    if (body.isCourtesy !== undefined) updateData.isCourtesy = body.isCourtesy
    if (existing) {
      await prisma.subscription.update({ where: { id: existing.id }, data: updateData })
    } else {
      await prisma.subscription.create({
        data: { businessId: id, plan: body.plan || "FREE", status: body.status || "ACTIVE" },
      })
    }

    // Auto-toggle chatbot based on plan (STARTER = off, NEGOCIO/PRO = on)
    if (body.plan) {
      const chatBotEnabled = ["NEGOCIO", "PRO", "SPORTS_NEGOCIO", "SPORTS_PRO"].includes(body.plan)
      await prisma.business.update({ where: { id }, data: { chatBotEnabled } })
    }
  }

  // Manual chatbot toggle from admin
  if (typeof body.chatBotEnabled === "boolean") {
    await prisma.business.update({ where: { id }, data: { chatBotEnabled: body.chatBotEnabled } })
  }

  // WhatsApp bot toggle (add-on)
  if (typeof body.whatsappBotEnabled === "boolean") {
    await prisma.business.update({ where: { id }, data: { whatsappBotEnabled: body.whatsappBotEnabled } })
  }

  return NextResponse.json({ success: true })
}
