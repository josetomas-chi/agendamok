import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const API_KEY = process.env.FLOW_API_KEY!
const SECRET_KEY = process.env.FLOW_SECRET_KEY!
const API_URL = process.env.FLOW_API_URL!

import crypto from "crypto"

function sign(params: Record<string, string>): string {
  const keys = Object.keys(params).sort()
  const toSign = keys.map(k => `${k}${params[k]}`).join("")
  return crypto.createHmac("sha256", SECRET_KEY).update(toSign).digest("hex")
}

async function flowPost(endpoint: string, data: Record<string, string>) {
  const params: Record<string, string> = { ...data, apiKey: API_KEY }
  params.s = sign(params)
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  })
  return res.json()
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/flow/webhook`
  const result = await flowPost("/merchant/setWebhook", { urlWebhook: webhookUrl })

  return NextResponse.json({ result, webhookUrl })
}
