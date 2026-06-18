"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Check, X, Loader2 } from "lucide-react"
import Link from "next/link"

export default function PaymentResultPage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "paid" | "failed">("loading")

  useEffect(() => {
    if (!token) { setStatus("failed"); return }
    fetch(`/api/book/${slug}/payment-result?token=${token}`)
      .then(r => r.json())
      .then(d => setStatus(d.paid ? "paid" : "failed"))
      .catch(() => setStatus("failed"))
  }, [slug, token])

  return (
    <div className="min-h-screen bg-[#1c1c1e] text-[#f4f4f5] flex items-center justify-center px-4">
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
              <p className="text-white/50 mt-2">Tu turno está confirmado. Recibirás un correo de confirmación.</p>
            </div>
            <Link href={`/book/${slug}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold text-sm">
              Reservar otro turno
            </Link>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <X className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pago no completado</h1>
              <p className="text-white/50 mt-2">El pago no fue procesado. Tu turno no fue confirmado.</p>
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
