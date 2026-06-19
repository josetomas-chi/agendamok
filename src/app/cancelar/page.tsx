"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2, Calendar } from "lucide-react"

type State = "loading" | "success" | "error"

function CancelarContent() {
  const params = useSearchParams()
  const token = params.get("token")
  const [state, setState] = useState<State>("loading")
  const [message, setMessage] = useState("")
  const [businessName, setBusinessName] = useState("")

  useEffect(() => {
    if (!token) { setState("error"); setMessage("Link de cancelación inválido."); return }

    fetch(`/api/public/cancel?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setState("success")
          setBusinessName(data.businessName)
        } else {
          setState("error")
          setMessage(data.error || "No se pudo cancelar el turno.")
        }
      })
      .catch(() => { setState("error"); setMessage("Error de conexión. Intenta nuevamente.") })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#28282c] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center" style={{ boxShadow: "0 0 16px rgba(14,165,233,0.5)" }}>
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">Agenda<span className="text-sky-400">Mok</span></span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#2c2c30] p-8 text-center">
          {state === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto mb-4" />
              <p className="text-white/60">Procesando cancelación...</p>
            </>
          )}

          {state === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Turno cancelado</h1>
              <p className="text-white/50 text-sm mb-6">
                Tu turno en <strong className="text-white/80">{businessName}</strong> ha sido cancelado correctamente.
              </p>
              <p className="text-white/35 text-xs">Si deseas reservar nuevamente, contacta al negocio o visita su página de reservas.</p>
            </>
          )}

          {state === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">No se pudo cancelar</h1>
              <p className="text-white/50 text-sm mb-6">{message}</p>
            </>
          )}
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          <Link href="/" className="hover:text-white/50 transition-colors">AgendaMok</Link>
        </p>
      </div>
    </div>
  )
}

export default function CancelarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#28282c]">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    }>
      <CancelarContent />
    </Suspense>
  )
}
