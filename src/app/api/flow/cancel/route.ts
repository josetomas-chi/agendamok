import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cancelSubscription } from "@/lib/flow"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { business: { include: { subscription: true } } },
  })

  const sub = user?.business?.subscription
  if (!sub?.flowSubscriptionId) {
    return NextResponse.json({ error: "No hay suscripcion activa" }, { status: 400 })
  }

  await cancelSubscription(sub.flowSubscriptionId)
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELED", plan: "FREE", cancelAtPeriodEnd: true },
  })

  return NextResponse.json({ success: true })
}
