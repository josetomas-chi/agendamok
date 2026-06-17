import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCustomer, registerCard } from "@/lib/flow"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { businessOwner: { include: { subscription: true } } },
    })

    if (!user?.businessOwner) return NextResponse.json({ error: "No tienes un negocio" }, { status: 400 })

    const business = user.businessOwner
    const subscription = business.subscription

    let flowCustomerId = subscription?.flowCustomerId

    if (!flowCustomerId) {
      const customer = await createCustomer(
        user.name || user.email!,
        user.email!,
        business.id
      )
      flowCustomerId = customer.customerId

      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { flowCustomerId },
        })
      } else {
        await prisma.subscription.create({
          data: {
            businessId: business.id,
            flowCustomerId,
            plan: "FREE",
            status: "TRIALING",
            trialEndsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        })
      }
    }

    const returnUrl = `${process.env.NEXTAUTH_URL}/onboarding/card-success`
    const result = await registerCard(flowCustomerId, returnUrl)

    return NextResponse.json({ url: result.url + result.token })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error desconocido"
    console.error("[POST /api/flow/register-card]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
