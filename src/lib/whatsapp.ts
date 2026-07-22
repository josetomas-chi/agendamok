// Meta Cloud API — WhatsApp Business
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

const META_API_URL = "https://graph.facebook.com/v20.0"

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
  phoneNumberId, to, clientName, businessName, serviceName, date, time,
}: {
  phoneNumberId: string
  to: string
  clientName: string
  businessName: string
  serviceName: string
  date: string
  time: string
}) {
  await sendTemplate(phoneNumberId, to, "recordatorio_24h", [clientName, businessName, serviceName, date, time])
}

// ─── Recordatorio 1h ─────────────────────────────────────────────────────────
// Template: "Hola {{1}} ⏰ Tu turno en *{{2}}* es en 1 hora: 📋 {{3}} a las {{4}} hrs. ¡Te esperamos!"

export async function sendWhatsAppReminder1h({
  phoneNumberId, to, clientName, businessName, serviceName, time,
}: {
  phoneNumberId: string
  to: string
  clientName: string
  businessName: string
  serviceName: string
  time: string
}) {
  await sendTemplate(phoneNumberId, to, "recordatorio_1h", [clientName, businessName, serviceName, time])
}

// ─── Reactivación ────────────────────────────────────────────────────────────
// Template: "Hola {{1}} 👋 Hace un tiempo que no te vemos en *{{2}}*. ¿Quieres agendar tu próxima visita? Escríbenos aquí mismo 😊"

export async function sendWhatsAppReactivation({
  phoneNumberId, to, clientName, businessName,
}: {
  phoneNumberId: string
  to: string
  clientName: string
  businessName: string
}) {
  await sendTemplate(phoneNumberId, to, "reactivacion", [clientName, businessName])
}

// ─── Resumen diario ──────────────────────────────────────────────────────────
// Template: "📊 Resumen de hoy en *{{1}}*: {{2}} turnos confirmados · {{3}} completados · {{4}} cancelados."

export async function sendWhatsAppDailySummary({
  phoneNumberId, to, businessName, confirmed, completed, cancelled,
}: {
  phoneNumberId: string
  to: string
  businessName: string
  confirmed: number
  completed: number
  cancelled: number
}) {
  await sendTemplate(phoneNumberId, to, "resumen_diario", [
    businessName,
    String(confirmed),
    String(completed),
    String(cancelled),
  ])
}
