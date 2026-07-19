"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle } from "lucide-react"

function CardSuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const isSports = params.get("type") === "SPORTS_CLUB"

  useEffect(() => {
    const t = setTimeout(() => router.push("/dashboard"), 5000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center px-4">
      <div className="bg-[#2c2c30] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-sky-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">¡Tarjeta registrada!</h1>
          <p className="text-white/50 mt-2 text-sm">
            Tu método de pago quedó guardado. No se realizará ningún cobro hasta que termine tu periodo de prueba.
          </p>
        </div>
        <div className="bg-sky-500/10 border border-sky-400/20 rounded-xl p-4 text-sm text-sky-300 text-left space-y-1">
          <p className="font-semibold">{isSports ? "AgendaMok Sports" : "AgendaMok — Plan Starter"}</p>
          <p className="text-white/40 text-xs">
            A partir del día 31 se cobra {isSports ? "1,1 UF" : "0,3 UF"} + IVA al mes. Puedes cancelar cuando quieras desde Configuración.
          </p>
        </div>
        <button
          className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold text-white"
          onClick={() => router.push("/dashboard")}
        >
          Ir al panel
        </button>
        <p className="text-xs text-white/20">Redirigiendo automáticamente en 5 segundos...</p>
      </div>
    </div>
  )
}

export default function CardSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1c1c1e]" />}>
      <CardSuccessContent />
    </Suspense>
  )
}
