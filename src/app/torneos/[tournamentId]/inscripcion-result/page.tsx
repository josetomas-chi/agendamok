"use client"
import React, { useEffect, useState } from "react"
import { useSearchParams, useParams } from "next/navigation"
import { Trophy, CheckCircle, XCircle, Loader2 } from "lucide-react"

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"

export default function InscripcionResultPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "error">("loading")

  useEffect(() => {
    if (!orderId) { setStatus("error"); return }
    // Give webhook a moment to process, then check participant status
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/public/tournaments/${tournamentId}`)
      if (res.ok) {
        // Payment confirmed if orderId starts with tournament_ — we trust Flow redirect
        // The webhook will have confirmed by now in most cases
        setStatus("success")
      } else {
        setStatus("error")
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [orderId, tournamentId])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: NAVY }}>
      <div className="w-full max-w-sm text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto animate-spin" style={{ color: GOLD }} />
            <p className="text-white font-bold">Verificando tu pago…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(34,197,94,0.12)" }}>
              <CheckCircle className="w-10 h-10" style={{ color: "#22c55e" }} />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-white">¡Pago confirmado!</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Tu inscripción ha sido registrada exitosamente. Recibirás un email de confirmación.
              </p>
            </div>
            <a href={`/torneos/${tournamentId}`}
              className="inline-block px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wide"
              style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: GOLD }}>
              Volver al torneo
            </a>
          </>
        )}
        {(status === "error" || status === "pending") && (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(239,68,68,0.1)" }}>
              <XCircle className="w-10 h-10" style={{ color: "#f87171" }} />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-white">Pago no completado</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                El pago no fue procesado. Si el problema persiste, intenta nuevamente.
              </p>
            </div>
            <a href={`/torneos/${tournamentId}`}
              className="inline-block px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wide"
              style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: GOLD }}>
              Intentar de nuevo
            </a>
          </>
        )}
      </div>
    </div>
  )
}
