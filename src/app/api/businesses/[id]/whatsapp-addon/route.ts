import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCustomer, createPlan, subscribeCustomer, cancelSubscription, WA_BOT_PLAN } from "@/lib/flow"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const business = await prisma.business.findUnique({
    where: { id },
    include: { subscription: true, user: { select: { id: true, name: true, email: true } } },
  })
  if (!business || business.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  if (business.waAddonStatus === "ACTIVE") {
    return NextResponse.json({ error: "El add-on ya está activo" }, { status: 400 })
  }

  let flowCustomerId = business.subscription?.flowCustomerId
  if (!flowCustomerId) {
    const customer = await createCustomer(
      business.user.name || business.user.email!,
      business.user.email!,
      business.id
    )
    flowCustomerId = customer.customerId
    if (business.subscription) {
      await prisma.subscription.update({ where: { id: business.subscription.id }, data: { flowCustomerId } })
    }
  }

  try { await createPlan(WA_BOT_PLAN.planId, WA_BOT_PLAN.name, WA_BOT_PLAN.amount, WA_BOT_PLAN.currency, WA_BOT_PLAN.interval) } catch {}

  const startDate = new Date().toISOString().split("T")[0]
  const flowSub = await subscribeCustomer(flowCustomerId, WA_BOT_PLAN.planId, startDate)

  await prisma.business.update({
    where: { id },
    data: {
      waAddonStatus: "ACTIVE",
      waFlowSubscriptionId: flowSub.subscriptionId,
      whatsappBotEnabled: true,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const business = await prisma.business.findUnique({ where: { id } })
  if (!business || business.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (business.waFlowSubscriptionId) {
    try { await cancelSubscription(business.waFlowSubscriptionId) } catch {}
  }

  await prisma.business.update({
    where: { id },
    data: { waAddonStatus: "CANCELLED", whatsappBotEnabled: false, waFlowSubscriptionId: null },
  })

  return NextResponse.json({ ok: true })
}
