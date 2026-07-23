import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { flowGet, verifyWebhookSignature } from "@/lib/flow"

const TOPUP_CONVERSATIONS = 50

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    if (!verifyWebhookSignature(params)) {
      return new Response("Unauthorized", { status: 401 })
    }

    const token = params.token
    if (!token) return new Response("", { status: 200 })

    const payment = await flowGet("/payment/getStatus", { token })
    // status 2 = paid
    if (payment?.status !== 2) return new Response("", { status: 200 })

    const commerceOrder: string = payment.commerceOrder || ""
    // format: wa-topup-{businessId}-{timestamp}
    const match = commerceOrder.match(/^wa-topup-([^-]+-[^-]+-[^-]+)-\d+$/) ||
                  commerceOrder.match(/^wa-topup-(.+)-\d+$/)
    if (!match) return new Response("", { status: 200 })

    const businessId = match[1]
    const month = new Date().toISOString().slice(0, 7)

    // Add 50 to the limit by creating/updating a separate "extra" field
    await prisma.whatsAppMonthlyUsage.upsert({
      where: { businessId_month: { businessId, month } },
      update: { extraLimit: { increment: TOPUP_CONVERSATIONS } },
      create: { businessId, month, count: 0, extraLimit: TOPUP_CONVERSATIONS },
    })

    return new Response("", { status: 200 })
  } catch (err) {
    console.error("[wa-topup/confirm]", err)
    return new Response("", { status: 200 })
  }
}
