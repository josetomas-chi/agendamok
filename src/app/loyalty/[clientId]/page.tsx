"use client"

import { useEffect, useState, use } from "react"
import QRCode from "qrcode"

type Benefit = { id: string; name: string; description: string | null; pointsCost: number; category: string }
type ClientData = {
  id: string; name: string; lastName: string | null; loyaltyPoints: number; segment: string; rut: string | null
  business: {
    id: string; name: string; logo: string | null; primaryColor: string | null
    loyaltyVipThreshold: number; loyaltyPesosPerPoint: number
    loyaltyBenefits: Benefit[]
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  courts: "🏟️ Canchas", store: "🛍️ Tienda", hydration: "💧 Hidratación", general: "🎁 General",
}

export default function LoyaltyCard({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  const [data, setData] = useState<ClientData | null>(null)
  const [qrUrl, setQrUrl] = useState("")
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"card" | "benefits">("card")

  useEffect(() => {
    fetch(`/api/loyalty/${clientId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d.client)
        const url = `${window.location.origin}/loyalty/${clientId}`
        QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
          .then(setQrUrl)
      })
      .catch(() => setError("Error al cargar"))
  }, [clientId])

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <p className="text-white/40 text-sm">{error}</p>
    </div>
  )
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const accent = data.business.primaryColor || "#38bdf8"
  const pct = Math.min(100, Math.round((data.business.loyaltyVipThreshold > 0 ? data.loyaltyPoints / data.business.loyaltyVipThreshold : 1) * 100))
  const isVip = data.segment === "VIP"
  const firstName = data.name.split(" ")[0]

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-950 py-8 px-4">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.06)" }}>
        {(["card", "benefits"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === t
              ? { background: accent, color: "#0f172a" }
              : { color: "rgba(255,255,255,0.4)" }}>
            {t === "card" ? "Mi Tarjeta" : "Beneficios"}
          </button>
        ))}
      </div>

      {tab === "card" && (
        <div className="w-full max-w-sm space-y-4">
          {/* Card */}
          <div className="relative rounded-3xl overflow-hidden p-6"
            style={{ background: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`, border: `1.5px solid ${accent}33` }}>
            {/* Top row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                {data.business.logo && (
                  <img src={data.business.logo} alt={data.business.name} className="h-8 object-contain mb-2 opacity-80" />
                )}
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {data.business.name}
                </p>
              </div>
              {isVip && (
                <span className="text-xs font-black px-2.5 py-1 rounded-full tracking-wider"
                  style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}>
                  VIP
                </span>
              )}
            </div>

            {/* Name */}
            <div className="mb-5">
              <p className="text-2xl font-black text-white tracking-tight">Hola, {firstName} 👋</p>
              {data.rut && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>RUT {data.rut}</p>}
            </div>

            {/* Points */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Puntos acumulados</p>
              <p className="text-4xl font-black" style={{ color: accent }}>{data.loyaltyPoints.toLocaleString("es-CL")}</p>
              {!isVip && (
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                    <span>Progreso VIP</span>
                    <span>{data.loyaltyPoints} / {data.business.loyaltyVipThreshold}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
                  </div>
                </div>
              )}
            </div>

            {/* Rate hint */}
            <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
              Ganas 1 punto por cada ${data.business.loyaltyPesosPerPoint.toLocaleString("es-CL")} gastados
            </p>
          </div>

          {/* QR */}
          <div className="rounded-2xl flex flex-col items-center py-6 px-4"
            style={{ background: "#ffffff" }}>
            <p className="text-xs font-bold text-slate-500 mb-3 tracking-wide uppercase">Muestra este código en recepción</p>
            {qrUrl && <img src={qrUrl} alt="QR code" className="w-52 h-52" />}
            <p className="text-[10px] text-slate-400 mt-3 text-center">
              El recepcionista escanea el código para sumar tus puntos
            </p>
          </div>

          {/* Install hint */}
          <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            💡 Agrega esta página a tu pantalla de inicio para acceso rápido
          </p>
        </div>
      )}

      {tab === "benefits" && (
        <div className="w-full max-w-sm space-y-3">
          <p className="text-center text-sm font-semibold text-white/60 mb-4">
            Tienes <span className="font-black" style={{ color: accent }}>{data.loyaltyPoints.toLocaleString("es-CL")} pts</span>
          </p>
          {data.business.loyaltyBenefits.length === 0 && (
            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              Próximamente habrá beneficios disponibles
            </p>
          )}
          {data.business.loyaltyBenefits.map(b => {
            const canRedeem = data.loyaltyPoints >= b.pointsCost
            return (
              <div key={b.id} className="rounded-2xl p-4"
                style={{ background: canRedeem ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${canRedeem ? accent + "44" : "rgba(255,255,255,0.06)"}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {CATEGORY_LABEL[b.category] ?? b.category}
                    </p>
                    <p className="text-sm font-bold" style={{ color: canRedeem ? "#fff" : "rgba(255,255,255,0.4)" }}>{b.name}</p>
                    {b.description && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{b.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black" style={{ color: canRedeem ? accent : "rgba(255,255,255,0.2)" }}>
                      {b.pointsCost.toLocaleString("es-CL")}
                    </p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>puntos</p>
                  </div>
                </div>
                {!canRedeem && (
                  <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Te faltan {(b.pointsCost - data.loyaltyPoints).toLocaleString("es-CL")} puntos
                  </p>
                )}
                {canRedeem && (
                  <p className="text-[10px] mt-2 font-semibold" style={{ color: accent }}>
                    ✓ Disponible — pide al recepcionista que lo canjee
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
