"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Wallet, CreditCard, ArrowRight, Building2, CheckCircle2, Copy, ChevronLeft } from "lucide-react"

type BusinessInfo = {
  name: string
  logo: string | null
  primaryColor: string | null
  flowEnabled: boolean
  bankName: string | null
  bankAccountHolder: string | null
  bankAccountNumber: string | null
  bankAccountType: string | null
  bankRut: string | null
  bankEmail: string | null
}

const AMOUNTS = [5000, 10000, 20000, 50000]

export default function WalletTopupPage() {
  const { slug } = useParams<{ slug: string }>()
  const [business, setBusiness] = useState<BusinessInfo | null>(null)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [amount, setAmount] = useState<number>(10000)
  const [customAmount, setCustomAmount] = useState("")
  const [method, setMethod] = useState<"FLOW" | "TRANSFER">("FLOW")
  const [loading, setLoading] = useState(false)
  const [transferInfo, setTransferInfo] = useState<{ txId: string; bank: BusinessInfo } | null>(null)
  const [copied, setCopied] = useState("")

  useEffect(() => {
    fetch(`/api/wallet/${slug}/info`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setBusiness(d) })
  }, [slug])

  const finalAmount = customAmount ? parseInt(customAmount.replace(/\D/g, "")) : amount

  async function handleSubmit() {
    if (!email || finalAmount < 1000) return
    setLoading(true)
    const r = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessSlug: slug, clientEmail: email, amount: finalAmount, method }),
    })
    const data = await r.json()
    setLoading(false)
    if (!r.ok) { setError(data.error || "Error al procesar"); return }
    if (data.redirect) window.location.href = data.redirect
    if (data.txId) setTransferInfo({ txId: data.txId, bank: data.bank })
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(""), 2000)
  }

  const accent = business?.primaryColor || "#38bdf8"

  if (error) return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="text-4xl mb-4">😕</div>
        <p className="text-gray-600 text-sm">{error}</p>
      </div>
    </div>
  )

  if (!business) return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
    </div>
  )

  if (transferInfo) return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-sm border border-gray-100 overflow-hidden">
        <a href="/profile" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-4 pt-4 pb-0">
          <ChevronLeft className="w-3.5 h-3.5" />Volver al perfil
        </a>
        <div className="px-6 py-8 text-center" style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent})` }}>
          <CheckCircle2 className="w-12 h-12 text-white mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Solicitud registrada</h1>
          <p className="text-white/80 text-sm mt-1">Tu saldo se acreditará una vez confirmada la transferencia</p>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-4">Realiza la transferencia por <span className="text-green-600">${finalAmount.toLocaleString("es-CL")}</span> a:</p>
          {[
            { label: "Banco", value: transferInfo.bank.bankName },
            { label: "Titular", value: transferInfo.bank.bankAccountHolder },
            { label: "RUT", value: transferInfo.bank.bankRut },
            { label: "Tipo de cuenta", value: transferInfo.bank.bankAccountType },
            { label: "N° de cuenta", value: transferInfo.bank.bankAccountNumber },
            { label: "Email", value: transferInfo.bank.bankEmail },
          ].filter(r => r.value).map(row => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{row.value}</span>
                <button onClick={() => copyText(row.value!, row.label)} className="text-gray-300 hover:text-gray-500 transition-colors">
                  {copied === row.label ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-2 text-center">Envía el comprobante a {business.name} para agilizar la confirmación.</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-sm border border-gray-100 overflow-hidden">
        <a href="/profile" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-4 pt-4 pb-0">
          <ChevronLeft className="w-3.5 h-3.5" />Volver al perfil
        </a>
        {/* Header */}
        <div className="px-6 py-8 text-center" style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent})` }}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            {business.logo
              ? <img src={business.logo} alt="" className="w-full h-full object-cover rounded-2xl" />
              : <Wallet className="w-7 h-7 text-white" />
            }
          </div>
          <h1 className="text-xl font-bold text-white">{business.name}</h1>
          <p className="text-white/80 text-sm mt-1">Recargar billetera virtual</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Tu email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-gray-800"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Monto a recargar</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustomAmount("") }}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${!customAmount && amount === a ? "border-sky-400 bg-sky-50 text-sky-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  ${(a / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="Otro monto (ej: 15000)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 text-gray-600"
            />
            {finalAmount >= 1000 && (
              <p className="text-xs text-gray-400 mt-1">Recarga: <span className="font-semibold text-gray-700">${finalAmount.toLocaleString("es-CL")}</span></p>
            )}
          </div>

          {/* Method */}
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1.5">Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {business.flowEnabled && (
                <button
                  onClick={() => setMethod("FLOW")}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors ${method === "FLOW" ? "border-sky-400 bg-sky-50 text-sky-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <CreditCard className="w-4 h-4" /> Pago online
                </button>
              )}
              <button
                onClick={() => setMethod("TRANSFER")}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors ${method === "TRANSFER" ? "border-sky-400 bg-sky-50 text-sky-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
              >
                <Building2 className="w-4 h-4" /> Transferencia
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!email || finalAmount < 1000 || loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Continuar <ArrowRight className="w-4 h-4" /></>}
          </button>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        </div>
      </div>
    </div>
  )
}
