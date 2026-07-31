"use client"

import { useEffect, useState } from "react"
import { X, Share, PlusSquare } from "lucide-react"

export function PWARegister() {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((err) => console.error("SW registration failed:", err))
    }

    // Show iOS install prompt if on iOS Safari and not already installed
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    const dismissed = sessionStorage.getItem("ios-prompt-dismissed")

    if (isIOS && !isStandalone && !dismissed) {
      // Delay a few seconds before showing
      const t = setTimeout(() => setShowIOSPrompt(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  if (!showIOSPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-[#2c2c30] border border-white/10 rounded-2xl p-4 shadow-2xl">
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
      <div className="flex items-center gap-2 text-gray-300 text-xs">
        <span>Toca</span>
        <Share className="w-4 h-4 text-sky-400" />
        <span>y luego</span>
        <PlusSquare className="w-4 h-4 text-sky-400" />
        <span className="font-medium">"Agregar a inicio"</span>
      </div>
    </div>
  )
}
