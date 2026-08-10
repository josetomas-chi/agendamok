// Meta Cloud API — WhatsApp Business
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

import { prisma } from "@/lib/prisma"
import { sendWhatsAppUsageWarning } from "@/lib/email"

const META_API_URL = "https://graph.facebook.com/v20.0"
const BASE_LIMIT = 100
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://agendamok.cl"

// Returns true if the business has quota and the count was incremented.
// Returns false if the addon is not active or the limit is reached.
async function checkAndTrackUsage(businessId: string): Promise<boolean> {
  const month = new Date().toISOString().slice(0, 7)

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      waAddonStatus: true,
      name: true,
      user: { select: { email: true, name: true } },
    },
  })

  if (!business || business.waAddonStatus !== "ACTIVE") return false

  const usage = await prisma.whatsAppMonthlyUsage.upsert({
    where: { businessId_month: { businessId, month } },
    create: { businessId, month, count: 0, extraLimit: 0 },
    update: {},
  })

  const limit = BASE_LIMIT + usage.extraLimit

  if (usage.count >= limit) {
    // Send limit-reached email once (exactly at the threshold)
    if (usage.count === limit && business.user?.email) {
      sendWhatsAppUsageWarning({
        ownerName: business.user.name ?? business.name,
        ownerEmail: business.user.email,
        businessName: business.name,
        count: usage.count,
        limit,
        settingsUrl: `${APP_URL}/dashboard/settings?tab=integrations`,
      }).catch(() => {})
    }
    return false
  }

  const updated = await prisma.whatsAppMonthlyUsage.update({
    where: { businessId_month: { businessId, month } },
    data: { count: { increment: 1 } },
  })

  // 80% warning
  const threshold80 = Math.floor(limit * 0.8)
  if (updated.count === threshold80 && business.user?.email) {
    sendWhatsAppUsageWarning({
      ownerName: business.user.name ?? business.name,
      ownerEmail: business.user.email,
      businessName: business.name,
      count: updated.count,
      limit,
      settingsUrl: `${APP_URL}/dashboard/settings?tab=integrations`,
    }).catch(() => {})
  }

  return true
}

// AgendaMok system user token — has access to all registered phone numbers
function getToken() {
  return process.env.META_WHATSAPP_TOKEN || ""
}

function normalizePhone(to: string): string {
  let phone = to.replace(/\s+/g, "").replace(/[^+\d]/g, "")
  if (phone.startsWith("9") && phone.length === 9) phone = "+569" + phone.slice(1)
  if (phone.startsWith("56") && !phone.startsWith("+")) phone = "+" + phone
  if (!phone.startsWith("+")) phone = "+56" + phone
  return phone.replace("+", "") // Meta requires E.164 without leading +
}

// ─── Send free-form text (only within 24h session window) ───────────────────

export async function sendWhatsAppMessage(phoneNumberId: string, to: string, body: string) {
  const token = getToken()
  if (!token || !phoneNumberId) return

  await fetch(`${META_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "text",
      text: { body },
    }),
  })
}

// ─── Send template message (business-initiated, any time) ───────────────────

async function sendTemplate(phoneNumberId: string, to: string, templateName: string, params: string[]) {
  const token = getToken()
  if (!token || !phoneNumberId) return

  await fetch(`${META_API_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: "es" },
        components: [{
          type: "body",
          parameters: params.map(text => ({ type: "text", text })),
        }],
      },
    }),
  })
}

// ─── Recordatorio 24h ────────────────────────────────────────────────────────
// Template: "Hola {{1}} 👋 Te recordamos que mañana tienes un turno en *{{2}}*: 📋 {{3}} · 📅 {{4}} · 🕐 {{5}} hrs"

export async function sendWhatsAppReminder24h({
  phoneNumberId, to, clientName, businessName, date, time, businessId,
}: {
  phoneNumberId: string
  to: string
  clientName: string
  businessName: string
  date: string
  time: string
  businessId: string
}) {
  if (!await checkAndTrackUsage(businessId)) return
  await sendTemplate(phoneNumberId, to, "recordatorio_turno_24h", [clientName, businessName, date, time])
}

// ─── Recordatorio 1h ─────────────────────────────────────────────────────────
// Template: "Hola {{1}} ⏰ Tu turno en *{{2}}* es en 1 hora: 📋 {{3}} a las {{4}} hrs. ¡Te esperamos!"

export async function sendWhatsAppReminder1h({
  phoneNumberId, to, clientName, businessName, time, businessId,
}: {
  phoneNumberId: string
  to: string
  clientName: string
  businessName: string
  time: string
  businessId: string
}) {
  if (!await checkAndTrackUsage(businessId)) return
  await sendTemplate(phoneNumberId, to, "recordatorio_turno_1h", [clientName, businessName, time])
}

// ─── Reactivación ────────────────────────────────────────────────────────────
// Template: "Hola {{1}} 👋 Hace un tiempo que no te vemos en *{{2}}*. ¿Quieres agendar tu próxima visita? Escríbenos aquí mismo 😊"

export async function sendWhatsAppReactivation({
  phoneNumberId, to, clientName, businessName, businessId,
}: {
  phoneNumberId: string
  to: string
  clientName: string
  businessName: string
  businessId: string
}) {
  if (!await checkAndTrackUsage(businessId)) return
  await sendTemplate(phoneNumberId, to, "reactivacion", [clientName, businessName])
}

// ─── Resumen diario ──────────────────────────────────────────────────────────
// Template: "📊 Resumen de hoy en *{{1}}*: {{2}} turnos confirmados · {{3}} completados · {{4}} cancelados."

export async function sendWhatsAppDailySummary({
  phoneNumberId, to, businessName, confirmed, completed, cancelled, businessId,
}: {
  phoneNumberId: string
  to: string
  businessName: string
  confirmed: number
  completed: number
  cancelled: number
  businessId: string
}) {
  if (!await checkAndTrackUsage(businessId)) return
  await sendTemplate(phoneNumberId, to, "resumen_diario", [
    businessName,
    String(confirmed),
    String(completed),
    String(cancelled),
  ])
}
