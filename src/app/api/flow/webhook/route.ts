import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature } from "@/lib/flow"
import { sendPaymentFailedAlert } from "@/lib/email"

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
    const sub = await prisma.subscription.findFirst({
      where: { flowCustomerId: customerId },
      include: { business: { include: { owner: true } } },
    })
    if (sub) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "PAST_DUE" },
      })
      const owner = sub.business?.owner
      if (owner?.email) {
        const PLAN_LABELS: Record<string, string> = {
          STARTER: "AgendaMok — Plan Starter",
          NEGOCIO: "AgendaMok — Plan Negocio",
          PRO:     "AgendaMok — Plan Pro",
          SPORTS:  "AgendaMok Sports",
        }
        await sendPaymentFailedAlert({
          ownerName:   owner.name || owner.email,
          ownerEmail:  owner.email,
          planLabel:   PLAN_LABELS[sub.plan] ?? sub.plan,
          settingsUrl: `${process.env.NEXTAUTH_URL}/dashboard/settings?tab=billing`,
        })
      }
    }
  }

  if (event === "subscription_canceled" || status === "canceled") {
    await prisma.subscription.updateMany({
      where: { flowSubscriptionId: subscriptionId },
      data: { status: "CANCELED" },
    })
  }

  if (event === "customer_register") {
    const subscription = await prisma.subscription.findFirst({
      where: { flowCustomerId: customerId },
    })
    if (subscription) {
      const { subscribeCustomer, createPlan, PLANS } = await import("@/lib/flow")
      const planKey = subscription.plan as keyof typeof PLANS
      const plan = PLANS[planKey]

      try {
        await createPlan(plan.planId, plan.name, plan.amount, plan.currency, plan.interval)
      } catch {
        // Plan may already exist in Flow, continue
      }

      // Schedule subscription to start after trial ends (or immediately if no trial)
      const trialEnd = subscription.trialEndsAt
      const startDate = trialEnd && trialEnd > new Date()
        ? trialEnd.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]

      const sub = await subscribeCustomer(customerId, plan.planId, startDate)
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          flowSubscriptionId: sub.subscriptionId,
          // Keep TRIALING if trial hasn't ended; Flow will send subscription_charged when it does
          status: trialEnd && trialEnd > new Date() ? "TRIALING" : "ACTIVE",
          ...(!(trialEnd && trialEnd > new Date()) && {
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }),
        },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
