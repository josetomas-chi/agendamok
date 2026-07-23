import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { flowGet } from "@/lib/flow"

// Flow calls back with ?token= after card registration
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) return NextResponse.json({ ok: false, error: "Token requerido" }, { status: 400 })

  try {
    // Look up the subscription that was being set up
    // Flow token comes from registerCard; we can look up by flowCustomerId in subscriptions
    // We store the token in the Flow session — just verify the customer is registered
    const result = await flowGet("/customer/getRegisterStatus", { token })

    if (!result || result.status !== 1) {
      return NextResponse.json({ ok: false, error: "Tarjeta no registrada" })
    }

    const customerId = result.customerId

    const subscription = await prisma.subscription.findFirst({
      where: { flowCustomerId: customerId },
      include: { business: { select: { user: { select: { email: true } } } } },
    })

    if (!subscription) {
      return NextResponse.json({ ok: false, error: "Suscripción no encontrada" })
    }

    // Mark subscription as active if it was pending
    if (subscription.status === "TRIALING" || subscription.status === "PENDING") {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "ACTIVE" },
      })
    }

    return NextResponse.json({
      ok: true,
      plan: subscription.plan,
      email: subscription.business?.user?.email ?? null,
    })
  } catch (err) {
    console.error("verify-card error:", err)
    return NextResponse.json({ ok: false, error: "Error al verificar" }, { status: 500 })
  }
}
