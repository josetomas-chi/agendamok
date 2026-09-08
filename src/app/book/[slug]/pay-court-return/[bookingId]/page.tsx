"use client"

import { useEffect, useState, Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Check, X, Loader2 } from "lucide-react"
import Link from "next/link"

function PayCourtReturnContent() {
  const { slug, bookingId } = useParams<{ slug: string; bookingId: string }>()
  const searchParams = useSearchParams()
  // Flow appends ?token=VALUE to our urlReturn — now cleanly readable
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "paid" | "failed">("loading")

  useEffect(() => {
    if (!bookingId) { setStatus("failed"); return }

    let attempts = 0
    const maxAttempts = 8

    async function poll() {
      attempts++
      try {
        const params = new URLSearchParams({ bookingId })
        if (token) params.set("token", token)
        const r = await fetch(`/api/book/${slug}/courts/booking-status?${params}`)
        const d = await r.json()
        console.log(`[pay-court-return] attempt ${attempts}:`, d)
        if (d.status === "confirmed") { setStatus("paid"); return }
        if (d.status === "cancelled") { setStatus("failed"); return }
        if (attempts < maxAttempts) {
          setTimeout(poll, 1500)
        } else {
          setStatus("failed")
        }
      } catch {
        if (attempts < maxAttempts) setTimeout(poll, 1500)
        else setStatus("failed")
      }
    }

    poll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#0d1b2a] text-[#f4f4f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-5">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-sky-400 animate-spin mx-auto" />
            <p className="text-white/50">Verificando pago...</p>
          </>
        )}
        {status === "paid" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pago exitoso</h1>
              <p className="text-white/50 mt-2">Tu cancha está reservada. Recibirás un correo de confirmación.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href={`/book/${slug}`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold text-sm">
                Reservar otra cancha
              </Link>
              <Link href={`/book/${slug}/my-bookings`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/20 hover:border-white/40 transition-colors font-semibold text-sm">
                Ver mis reservas
              </Link>
            </div>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <X className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pago no completado</h1>
              <p className="text-white/50 mt-2">El pago no fue procesado. La reserva fue cancelada.</p>
            </div>
            <Link href={`/book/${slug}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/20 hover:border-white/40 transition-colors font-semibold text-sm">
              Volver a intentar
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function PayCourtReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1b2a]" />}>
      <PayCourtReturnContent />
    </Suspense>
  )
}
