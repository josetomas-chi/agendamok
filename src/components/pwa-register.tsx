"use client"

import { useEffect, useState } from "react"
import { X, Share, Bell } from "lucide-react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  })

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub }),
  })

  return sub
}

export function PWARegister() {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [showPushBanner, setShowPushBanner] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async () => {
        // After SW is ready, check push permission
        if (!("PushManager" in window)) return
        const permission = Notification.permission
        if (permission === "granted") {
          // Already granted — silently ensure subscribed
          subscribeToPush().catch(() => {})
          return
        }
        if (permission === "denied") return

        // Show our banner after 5s on dashboard pages only
        const isDashboard = window.location.pathname.startsWith("/dashboard") ||
          window.location.pathname.startsWith("/staff")
        if (!isDashboard) return
        const dismissed = localStorage.getItem("push-banner-dismissed")
        if (dismissed) return
        setTimeout(() => setShowPushBanner(true), 5000)
      })
      .catch((err) => console.error("SW registration failed:", err))

    // iOS install prompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    const ioDismissed = sessionStorage.getItem("ios-prompt-dismissed")
    if (isIOS && !isStandalone && !ioDismissed) {
      setTimeout(() => setShowIOSPrompt(true), 4000)
    }
  }, [])

  async function handleEnablePush() {
    setShowPushBanner(false)
    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        await subscribeToPush()
      }
    } catch (err) {
      console.error("Push subscription failed:", err)
    }
  }

  return (
    <>
      {/* Push notification banner */}
      {showPushBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-[#2c2c30] border border-white/10 rounded-2xl p-4 shadow-2xl max-w-sm mx-auto">
          <button
            onClick={() => {
              setShowPushBanner(false)
              localStorage.setItem("push-banner-dismissed", "1")
            }}
            className="absolute top-3 right-3 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Activar notificaciones</p>
              <p className="text-gray-400 text-xs">Recibe alertas de nuevos turnos</p>
            </div>
          </div>
          <button
            onClick={handleEnablePush}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-medium py-2 rounded-xl text-sm transition-colors"
          >
            Activar
          </button>
        </div>
      )}

      {/* iOS install banner */}
      {showIOSPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-[#2c2c30] border border-white/10 rounded-2xl p-4 shadow-2xl max-w-sm mx-auto">
          <button
            onClick={() => {
              setShowIOSPrompt(false)
              sessionStorage.setItem("ios-prompt-dismissed", "1")
            }}
            className="absolute top-3 right-3 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <img src="/icon-192.png" alt="AgendaMok" className="w-10 h-10 rounded-xl" />
            <div>
              <p className="text-white font-semibold text-sm">Instalar AgendaMok</p>
              <p className="text-gray-400 text-xs">Acceso rápido desde tu pantalla</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-300 text-xs flex-wrap">
            <span>Toca</span>
            <Share className="w-4 h-4 text-sky-400 shrink-0" />
            <span>y luego</span>
            <span className="font-semibold text-sky-400">"Agregar a inicio"</span>
          </div>
        </div>
      )}
    </>
  )
}
