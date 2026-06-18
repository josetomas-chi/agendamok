import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { businessGetPaymentStatus } from "@/lib/flow"

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  if (!token) return NextResponse.json({ paid: false })

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { flowApiKey: true, flowSecretKey: true },
  })
  if (!business?.flowApiKey || !business?.flowSecretKey) {
    return NextResponse.json({ paid: false })
  }

  try {
    const payment = await businessGetPaymentStatus(business.flowApiKey, business.flowSecretKey, token)
    return NextResponse.json({ paid: payment.status === 2 })
  } catch {
    return NextResponse.json({ paid: false })
  }
}
