import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature } from "@/lib/flow"

export async function POST(req: Request) {
  const body = await req.text()
  const params = Object.fromEntries(new URLSearchParams(body))

  if (!verifyWebhookSignature(params)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 })
  }

  const { event, customerId, subscriptionId, status } = params

  if (event === "subscription_charged") {
    await prisma.subscription.updateMany({
      where: { flowCustomerId: customerId },
      data: {
        status: "ACTIVE",
        flowSubscriptionId: subscriptionId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
  }

  if (event === "subscription_charge_failed") {
    await prisma.subscription.updateMany({
      where: { flowCustomerId: customerId },
      data: { status: "PAST_DUE" },
    })
  }

  if (event === "subscription_canceled" || status === "canceled") {
    await prisma.subscription.updateMany({
      where: { flowSubscriptionId: subscriptionId },
      data: { status: "CANCELED", plan: "FREE" },
    })
  }

  if (event === "customer_register") {
    // Card registered — now subscribe the customer to their plan
    const subscription = await prisma.subscription.findFirst({
      where: { flowCustomerId: customerId },
    })
    if (subscription && subscription.plan !== "FREE") {
      const { subscribeCustomer, createPlan, PLANS } = await import("@/lib/flow")
      const plan = PLANS[subscription.plan as keyof typeof PLANS]
      const planId = `agenda-pro-${subscription.plan.toLowerCase()}`

      try {
        await createPlan(planId, plan.name, plan.amount, plan.currency, plan.interval)
      } catch {
        // Plan may already exist, continue
      }

      const sub = await subscribeCustomer(customerId, planId)
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          flowSubscriptionId: sub.subscriptionId,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
