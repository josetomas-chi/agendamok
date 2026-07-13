import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const { plan, status, trialEndsAt, currentPeriodEnd } = body

  const sub = await prisma.subscription.update({
    where: { id },
    data: {
      ...(plan && { plan }),
      ...(status && { status }),
      ...(trialEndsAt !== undefined && { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null }),
      ...(currentPeriodEnd !== undefined && { currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null }),
    },
  })
  return NextResponse.json({ sub })
}
