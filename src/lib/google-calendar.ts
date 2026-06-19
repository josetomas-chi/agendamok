import { calendar_v3 } from "@googleapis/calendar"
import { prisma } from "@/lib/prisma"

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"}/api/integrations/google-calendar/callback`

export function getOAuthUrl(businessId: string) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state: businessId,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function exchangeCode(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  })
  if (!res.ok) throw new Error("Failed to exchange code")
  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }>
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) throw new Error("Failed to refresh token")
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

export async function saveGoogleCalendarTokens(businessId: string, code: string) {
  const tokens = await exchangeCode(code)
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await prisma.googleCalendarIntegration.upsert({
    where: { businessId },
    create: {
      businessId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    },
  })
}

async function getValidAccessToken(businessId: string): Promise<string | null> {
  const integration = await prisma.googleCalendarIntegration.findUnique({
    where: { businessId },
  })
  if (!integration) return null

  if (integration.expiresAt > new Date()) return integration.accessToken

  // Refresh
  try {
    const refreshed = await refreshAccessToken(integration.refreshToken)
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000)
    await prisma.googleCalendarIntegration.update({
      where: { businessId },
      data: { accessToken: refreshed.access_token, expiresAt },
    })
    return refreshed.access_token
  } catch {
    return null
  }
}

export async function createCalendarEvent({
  businessId,
  appointmentId,
  summary,
  description,
  location,
  startTime,
  endTime,
}: {
  businessId: string
  appointmentId: string
  summary: string
  description: string
  location?: string
  startTime: Date
  endTime: Date
}) {
  const accessToken = await getValidAccessToken(businessId)
  if (!accessToken) return

  const event: calendar_v3.Schema$Event = {
    summary,
    description,
    location,
    start: { dateTime: startTime.toISOString(), timeZone: "America/Santiago" },
    end: { dateTime: endTime.toISOString(), timeZone: "America/Santiago" },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }] },
  }

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  })

  if (!res.ok) return

  const created = await res.json()
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { googleEventId: created.id },
  })
}

export async function deleteCalendarEvent(businessId: string, googleEventId: string) {
  const accessToken = await getValidAccessToken(businessId)
  if (!accessToken) return

  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function disconnectGoogleCalendar(businessId: string) {
  await prisma.googleCalendarIntegration.deleteMany({ where: { businessId } })
}
