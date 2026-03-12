import webpush from "web-push"

let initialized = false

function ensureVapid() {
  if (initialized) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      "mailto:support@mediend.com",
      publicKey,
      privateKey
    )
    initialized = true
  }
}

export interface PushSubscriptionPayload {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export async function sendPushNotification(
  subscription: PushSubscriptionPayload,
  payload: { title: string; body: string; url?: string }
): Promise<boolean> {
  ensureVapid()
  if (!process.env.VAPID_PRIVATE_KEY) return false

  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24,
      }
    )
    return true
  } catch (err) {
    console.error("[push] send failed:", err)
    return false
  }
}
