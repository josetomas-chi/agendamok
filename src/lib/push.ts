import webpush from "web-push"
import { prisma } from "@/lib/prisma"

type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
}

function getWebPush() {
  if (!process.env.VAPID_EMAIL || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return null
  }
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  return webpush
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  return sendToSubscriptions(subs, payload)
}

export async function sendPushToClient(clientId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { clientId } })
  return sendToSubscriptions(subs, payload)
}

async function sendToSubscriptions(
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
) {
  const wp = getWebPush()
  if (!wp || subs.length === 0) return []

  const results = await Promise.allSettled(
    subs.map((sub) =>
      wp
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...payload, icon: payload.icon || "/icon-192.png" })
        )
        .catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          }
          throw err
        })
    )
  )
  return results
}
