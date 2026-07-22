import twilio from "twilio"

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+17373094339"

function normalizePhone(to: string) {
  let phone = to.replace(/\s+/g, "").replace(/[^+\d]/g, "")
  if (phone.startsWith("9") && phone.length === 9) phone = "+569" + phone.slice(1)
  if (phone.startsWith("56") && !phone.startsWith("+")) phone = "+" + phone
  if (!phone.startsWith("+")) phone = "+56" + phone
  return phone
}

export async function sendWhatsAppMessage(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return
  const phone = normalizePhone(to)
  await client.messages.create({ from: FROM, to: `whatsapp:${phone}`, body })
}

export async function sendWhatsAppReminder({
  to,
  clientName,
  businessName,
  serviceName,
  date,
  time,
  customBody,
}: {
  to: string
  clientName: string
  businessName: string
  serviceName: string
  date: string
  time: string
  customBody?: string
}) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return

  const phone = normalizePhone(to)
  const body = customBody ??
    `Hola ${clientName} 👋\n\nTe recordamos que mañana tienes un turno en *${businessName}*:\n\n📋 *${serviceName}*\n📅 ${date}\n🕐 ${time} hrs\n\n_AgendaMok — Sistema de reservas online_`

  await client.messages.create({ from: FROM, to: `whatsapp:${phone}`, body })
}
