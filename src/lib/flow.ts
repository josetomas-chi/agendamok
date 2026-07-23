import crypto from "crypto"

const API_KEY = process.env.FLOW_API_KEY!
const SECRET_KEY = process.env.FLOW_SECRET_KEY!
const API_URL = process.env.FLOW_API_URL!

function sign(params: Record<string, string>): string {
  const keys = Object.keys(params).sort()
  const toSign = keys.map(k => `${k}${params[k]}`).join("")
  return crypto.createHmac("sha256", SECRET_KEY).update(toSign).digest("hex")
}

async function flowRequest(endpoint: string, data: Record<string, string>) {
  const params: Record<string, string> = { ...data, apiKey: API_KEY }
  params.s = sign(params)

  const body = new URLSearchParams(params)
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Flow error ${res.status}: ${text}`)
  }

  return res.json()
}

export async function flowGet(endpoint: string, params: Record<string, string>) {
  const all: Record<string, string> = { ...params, apiKey: API_KEY }
  all.s = sign(all)
  const qs = new URLSearchParams(all).toString()
  const res = await fetch(`${API_URL}${endpoint}?${qs}`)
  return res.json()
}

// Plans (prices in UF, IVA not included — Flow adds it)
export const PLANS = {
  STARTER: { planId: "agendamok_starter_v2", name: "AgendaMok — Plan Starter", amount: 0.3, currency: "UF", interval: 1 },
  NEGOCIO: { planId: "agendamok_negocio_v2", name: "AgendaMok — Plan Negocio", amount: 0.7, currency: "UF", interval: 1 },
  PRO:     { planId: "agendamok_pro_v2",     name: "AgendaMok — Plan Pro",     amount: 1.1, currency: "UF", interval: 1 },
  SPORTS:  { planId: "agendamok_sports_v2",  name: "AgendaMok Sports",         amount: 1.1, currency: "UF", interval: 1 },
}

export const WA_BOT_PLAN = { planId: "agendamok_wa_bot_v1", name: "AgendaMok — Bot IA WhatsApp", amount: 0.2, currency: "UF", interval: 1 }

// Create a Flow customer
export async function createCustomer(name: string, email: string, externalId: string) {
  return flowRequest("/customer/create", { name, email, externalId })
}

// Get or create customer
export async function getCustomer(customerId: string) {
  return flowGet("/customer/get", { customerId })
}

// Send registration card link to customer
export async function registerCard(customerId: string, returnUrl: string) {
  return flowRequest("/customer/register", {
    customerId,
    url_return: returnUrl,
  })
}

// Create a subscription plan in Flow
export async function createPlan(planId: string, name: string, amount: number, currency: string, interval: number) {
  return flowRequest("/plan/create", {
    planId,
    name,
    amount: String(amount),
    currency,
    interval: String(interval),
    interval_count: "1",
    trial_period_days: "0",
  })
}

// Subscribe a customer to a plan
export async function subscribeCustomer(customerId: string, planId: string, startDate?: string) {
  return flowRequest("/subscription/create", {
    planId,
    customerId,
    subscription_start: startDate ?? new Date().toISOString().split("T")[0],
  })
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  return flowRequest("/subscription/cancel", { subscriptionId })
}

// Create one-time payment (for checkout)
export async function createPaymentLink(params: {
  commerceOrder: string
  subject: string
  amount: number
  email: string
  urlReturn: string
  urlConfirmation: string
}) {
  const data = {
    commerceOrder: params.commerceOrder,
    subject: params.subject,
    amount: String(params.amount),
    email: params.email,
    urlReturn: params.urlReturn,
    urlConfirmation: params.urlConfirmation,
    paymentMethod: "9", // all methods
  }
  return flowRequest("/payment/create", data)
}

export function verifyWebhookSignature(params: Record<string, string>): boolean {
  const { s, ...rest } = params
  const expected = sign(rest)
  return expected === s
}

// ─── Business-owned Flow credentials ─────────────────────────────────────────
// These functions use credentials stored per-business (Option A model).

function signWith(params: Record<string, string>, secret: string): string {
  const keys = Object.keys(params).sort()
  const toSign = keys.map(k => `${k}${params[k]}`).join("")
  return crypto.createHmac("sha256", secret).update(toSign).digest("hex")
}

async function businessFlowRequest(
  apiKey: string,
  secretKey: string,
  endpoint: string,
  data: Record<string, string>
) {
  const params: Record<string, string> = { ...data, apiKey }
  params.s = signWith(params, secretKey)
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Flow error ${res.status}: ${text}`)
  return JSON.parse(text)
}

async function businessFlowGet(
  apiKey: string,
  secretKey: string,
  endpoint: string,
  data: Record<string, string>
) {
  const params: Record<string, string> = { ...data, apiKey }
  params.s = signWith(params, secretKey)
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${API_URL}${endpoint}?${qs}`)
  return res.json()
}

export async function businessCreatePayment(
  apiKey: string,
  secretKey: string,
  params: {
    commerceOrder: string
    subject: string
    amount: number
    email: string
    urlReturn: string
    urlConfirmation: string
  }
) {
  return businessFlowRequest(apiKey, secretKey, "/payment/create", {
    commerceOrder: params.commerceOrder,
    subject: params.subject,
    amount: String(params.amount),
    email: params.email,
    urlReturn: params.urlReturn,
    urlConfirmation: params.urlConfirmation,
    paymentMethod: "9",
  })
}

export async function businessGetPaymentStatus(
  apiKey: string,
  secretKey: string,
  token: string
) {
  return businessFlowGet(apiKey, secretKey, "/payment/getStatus", { token })
}

export function verifyBusinessWebhook(
  secretKey: string,
  params: Record<string, string>
): boolean {
  const { s, ...rest } = params
  return signWith(rest, secretKey) === s
}
