import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { subscription, clientId } = await req.json()
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 })
  }

  const session = await auth()
  const userId = session?.user?.id ?? null

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: req.headers.get("user-agent") ?? undefined,
      userId: userId ?? undefined,
      clientId: clientId ?? undefined,
    },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userId: userId ?? undefined,
      clientId: clientId ?? undefined,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 })

  await prisma.pushSubscription.deleteMany({ where: { endpoint } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
