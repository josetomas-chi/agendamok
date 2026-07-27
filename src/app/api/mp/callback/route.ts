import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { exchangeCodeForTokens } from "@/lib/mercadopago"

const APP_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const businessId = searchParams.get("state")
  const error = searchParams.get("error")

  if (error || !code || !businessId) {
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?tab=payments&mp=error`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    await prisma.business.update({
      where: { id: businessId },
      data: {
        mpAccessToken: tokens.access_token,
        mpRefreshToken: tokens.refresh_token,
        mpPublicKey: tokens.public_key,
        mpUserId: String(tokens.user_id),
        mpConnected: true,
      },
    })

    return NextResponse.redirect(`${APP_URL}/dashboard/settings?tab=payments&mp=success`)
  } catch {
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?tab=payments&mp=error`)
  }
}
