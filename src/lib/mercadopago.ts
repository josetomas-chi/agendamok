const MP_API = "https://api.mercadopago.com"
const APP_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000"

export const MP_CLIENT_ID = process.env.MP_CLIENT_ID!
export const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET!
export const MP_REDIRECT_URI = `${APP_URL}/api/mp/callback`
export const MP_COMMISSION_RATE = 0.01 // 1%

export function getMpAuthUrl(businessId: string) {
  const params = new URLSearchParams({
    client_id: MP_CLIENT_ID,
    response_type: "code",
    platform_id: "mp",
    redirect_uri: MP_REDIRECT_URI,
    state: businessId,
  })
  return `https://auth.mercadopago.com/authorization?${params}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: MP_REDIRECT_URI,
    }),
  })
  if (!res.ok) throw new Error("MP OAuth token exchange failed")
  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    public_key: string
    user_id: number
  }>
}

export async function createMpPreference({
  accessToken,
  title,
  amount,
  currency,
  externalReference,
  successUrl,
  failureUrl,
  pendingUrl,
  notificationUrl,
}: {
  accessToken: string
  title: string
  amount: number
  currency: string
  externalReference: string
  successUrl: string
  failureUrl: string
  pendingUrl: string
  notificationUrl: string
}) {
  const commission = Math.round(amount * MP_COMMISSION_RATE * 100) / 100

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [{ title, quantity: 1, unit_price: amount, currency_id: currency }],
      back_urls: { success: successUrl, failure: failureUrl, pending: pendingUrl },
      auto_return: "approved",
      notification_url: notificationUrl,
      external_reference: externalReference,
      application_fee: commission,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MP preference creation failed: ${err}`)
  }
  return res.json() as Promise<{ id: string; init_point: string; sandbox_init_point: string }>
}

export async function getMpPayment(paymentId: string, accessToken: string) {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error("MP payment fetch failed")
  return res.json()
}

export async function refundMpPayment(paymentId: string, accessToken: string, amount?: number) {
  const body: Record<string, number> = {}
  if (amount !== undefined) body.amount = amount
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MP refund failed: ${err}`)
  }
  return res.json()
}
