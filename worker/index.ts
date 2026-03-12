/* Custom worker for next-pwa: push notification handlers */
// @ts-nocheck - Worker runs in isolated env; types differ from main build
const sw = self

sw.addEventListener("push", (event) => {
  if (!event.data) return
  let data
  try {
    data = event.data.json()
  } catch {
    return
  }
  const title = data?.title ?? "Work Log Reminder"
  const body = data?.body ?? "Time to log your work"
  const url = data?.url ?? "/home"
  event.waitUntil(
    sw.registration.showNotification(title, {
      body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url },
      tag: "work-log-reminder",
      renotify: true,
    })
  )
})

sw.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/home"
  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0]
        client.navigate(url)
        client.focus()
      } else if (sw.clients.openWindow) {
        sw.clients.openWindow(url)
      }
    })
  )
})
