"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"

export default function WalletResultPage() {
  const searchParams = useSearchParams()
  const txId = searchParams.get("txId")
  const [status, setStatus] = useState<"loading" | "confirmed" | "rejected">("loading")
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    if (!txId) return
    const poll = async () => {
      for (let i = 0; i < 6; i++) {
        const r = await fetch(`/api/wallet/tx/${txId}`)
        const d = await r.json()
        if (d.status === "CONFIRMED") { setAmount(d.amount); setStatus("confirmed"); return }
        if (d.status === "REJECTED") { setStatus("rejected"); return }
        await new Promise(res => setTimeout(res, 2000))
      }
      setStatus("rejected")
    }
    poll()
  }, [txId])

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
        {status === "loading" && (
          <>
            <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Confirmando pago...</p>
          </>
        )}
        {status === "confirmed" && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">¡Saldo acreditado!</h2>
            <p className="text-gray-500 text-sm">Se han agregado <span className="font-semibold text-green-600">${amount.toLocaleString("es-CL")}</span> a tu billetera.</p>
          </>
        )}
        {status === "rejected" && (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Pago no completado</h2>
            <p className="text-gray-500 text-sm">El pago fue rechazado o cancelado. Tu saldo no fue modificado.</p>
          </>
        )}
      </div>
    </div>
  )
}
