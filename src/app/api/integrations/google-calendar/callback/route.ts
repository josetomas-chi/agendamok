import { NextResponse } from "next/server"
import { saveGoogleCalendarTokens } from "@/lib/google-calendar"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const businessId = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"

  if (error || !code || !businessId) {
    return NextResponse.redirect(`${base}/dashboard/settings?tab=integrations&gcal=error`)
  }

  try {
    await saveGoogleCalendarTokens(businessId, code)
    return NextResponse.redirect(`${base}/dashboard/settings?tab=integrations&gcal=success`)
  } catch {
    return NextResponse.redirect(`${base}/dashboard/settings?tab=integrations&gcal=error`)
  }
}
