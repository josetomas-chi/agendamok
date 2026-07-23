import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCustomer, registerCard, PLANS } from "@/lib/flow"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { plan } = await req.json()
    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { businessOwner: { include: { subscription: true } } },
    })

    if (!user?.businessOwner) return NextResponse.json({ error: "No tienes un negocio" }, { status: 400 })

    const business = user.businessOwner
    const subscription = business.subscription

    let flowCustomerId = subscription?.flowCustomerId

    // Create Flow customer if doesn't exist
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
          data: { flowCustomerId, plan },
        })
      } else {
        // New customer — grant 30-day trial
        await prisma.subscription.create({
          data: {
            businessId: business.id,
            flowCustomerId,
            plan,
            status: "TRIALING",
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
      }
    } else {
      // Existing customer changing plan — only update plan, keep trial/status untouched
      await prisma.subscription.update({
        where: { businessId: business.id },
        data: { plan },
      })
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.cl"}/suscripcion/gracias`
    const result = await registerCard(flowCustomerId, returnUrl)

    if (!result?.url || !result?.token) {
      console.error("Flow registerCard response:", result)
      return NextResponse.json({ error: "Flow no devolvió URL de pago. Verifica las credenciales." }, { status: 502 })
    }

    return NextResponse.json({ url: result.url + "?token=" + result.token })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Flow subscribe error:", msg)
    return NextResponse.json({ error: `Error Flow: ${msg}` }, { status: 502 })
  }
}
