"use client"

import { useCallback, useEffect, useState } from "react"
import { apiPost } from "@/lib/api-client"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushSubscription() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        !!VAPID_PUBLIC_KEY
    )
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false
    if (permission === "denied") return false

    try {
      let perm = Notification.permission
      if (perm === "default") {
        perm = await Notification.requestPermission()
        setPermission(perm)
      }
      if (perm !== "granted") return false

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        })
      }
      const payload = sub.toJSON()
      await apiPost("/api/push/subscribe", {
        endpoint: payload.endpoint!,
        keys: payload.keys!,
      })
      return true
    } catch (err) {
      console.error("[push] subscribe failed:", err)
      return false
    }
  }, [isSupported, permission])

  return { subscribe, permission, isSupported }
}
