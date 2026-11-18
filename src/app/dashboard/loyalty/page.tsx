"use client"

import { useState, useEffect, useCallback } from "react"
import { useBusiness } from "@/contexts/business-context"
import { QrCode, Gift, History, Settings2, Plus, Trash2, Check, X, Loader2, ScanLine } from "lucide-react"
import { toast } from "sonner"

const NAVY = "#0d1b2a"
const ACCENT = "#38bdf8"
const BORDER = "rgba(13,27,42,0.1)"
const CARD = "rgba(13,27,42,0.03)"
const INPUT_BG = "rgba(13,27,42,0.04)"
const MUTED = "rgba(13,27,42,0.4)"
const MUTED2 = "rgba(13,27,42,0.25)"

type Benefit = { id: string; name: string; description: string | null; pointsCost: number; category: string; isActive: boolean }
type Transaction = {
  id: string; type: string; points: number; amountPaid: number | null; description: string; staffName: string | null; createdAt: string
  client: { id: string; name: string; lastName: string | null }
  benefit: { name: string } | null
}
type ScannedClient = { id: string; name: string; lastName: string | null; loyaltyPoints: number; segment: string; rut: string | null }

const CATEGORY_OPTIONS = [
  { value: "general", label: "🎁 General" },
  { value: "courts", label: "🏟️ Canchas" },
  { value: "store", label: "🛍️ Tienda" },
  { value: "hydration", label: "💧 Hidratación" },
]

export default function LoyaltyPage() {
  const { businessId } = useBusiness()
  const [tab, setTab] = useState<"scan" | "benefits" | "history" | "settings">("scan")

  const [manualClientId, setManualClientId] = useState("")
  const [scannedClient, setScannedClient] = useState<ScannedClient | null>(null)
  const [loadingClient, setLoadingClient] = useState(false)
  const [earnAmount, setEarnAmount] = useState("")
  const [earnDesc, setEarnDesc] = useState("")
  const [earning, setEarning] = useState(false)
  const [redeemBenefitId, setRedeemBenefitId] = useState("")
  const [redeeming, setRedeeming] = useState(false)
  const [benefits, setBenefits] = useState<Benefit[]>([])
  const [scanSuccess, setScanSuccess] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTx, setLoadingTx] = useState(false)

  const [savingBenefit, setSavingBenefit] = useState(false)
  const [newBenefit, setNewBenefit] = useState({ name: "", description: "", pointsCost: "", category: "general" })
  const [showBenefitForm, setShowBenefitForm] = useState(false)

  const [settings, setSettings] = useState({ loyaltyPesosPerPoint: 100, loyaltyVipThreshold: 500 })
  const [savingSettings, setSavingSettings] = useState(false)

  const loadBenefits = useCallback(async (bid: string) => {
    const r = await fetch(`/api/businesses/${bid}/loyalty/benefits`)
    if (r.ok) { const d = await r.json(); setBenefits(d.benefits || []) }
  }, [])

  const loadTransactions = useCallback(async (bid: string) => {
    setLoadingTx(true)
    const r = await fetch(`/api/businesses/${bid}/loyalty/transactions?limit=100`)
    if (r.ok) { const d = await r.json(); setTransactions(d.transactions || []) }
    setLoadingTx(false)
  }, [])

  const loadSettings = useCallback(async (bid: string) => {
    const r = await fetch(`/api/businesses/${bid}`)
    if (r.ok) {
      const d = await r.json()
      setSettings({
        loyaltyPesosPerPoint: d.business?.loyaltyPesosPerPoint ?? 100,
        loyaltyVipThreshold: d.business?.loyaltyVipThreshold ?? 500,
      })
    }
  }, [])

  useEffect(() => {
    if (!businessId) return
    loadBenefits(businessId)
    loadSettings(businessId)
  }, [businessId, loadBenefits, loadSettings])

  useEffect(() => {
    if (tab === "history" && businessId) loadTransactions(businessId)
  }, [tab, businessId, loadTransactions])

  async function lookupClient(id: string) {
    if (!id.trim()) return
    setLoadingClient(true); setScannedClient(null); setScanSuccess(null)
    const r = await fetch(`/api/loyalty/${id.trim()}`)
    if (r.ok) { const d = await r.json(); setScannedClient(d.client) }
    else toast.error("Cliente no encontrado")
    setLoadingClient(false)
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    const cid = url.searchParams.get("client")
    if (cid) { setManualClientId(cid); lookupClient(cid); window.history.replaceState({}, "", window.location.pathname) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleEarn() {
    if (!scannedClient || !earnAmount) return
    setEarning(true)
    const r = await fetch(`/api/loyalty/${scannedClient.id}/earn`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountPaid: Number(earnAmount), description: earnDesc || undefined }),
    })
    const d = await r.json()
    if (r.ok) {
      setScanSuccess(`+${d.pointsEarned} puntos sumados`)
      setScannedClient(c => c ? { ...c, loyaltyPoints: d.totalPoints } : c)
      setEarnAmount(""); setEarnDesc("")
      toast.success(`+${d.pointsEarned} puntos para ${scannedClient.name}`)
      if (businessId) loadTransactions(businessId)
    } else toast.error(d.error || "Error")
    setEarning(false)
  }

  async function handleRedeem() {
    if (!scannedClient || !redeemBenefitId) return
    setRedeeming(true)
    const r = await fetch(`/api/loyalty/${scannedClient.id}/redeem`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ benefitId: redeemBenefitId }),
    })
    const d = await r.json()
    if (r.ok) {
      setScanSuccess(`Canjeado: ${d.benefitName}`)
      setScannedClient(c => c ? { ...c, loyaltyPoints: d.totalPoints } : c)
      setRedeemBenefitId("")
      toast.success(`Beneficio canjeado: ${d.benefitName}`)
      if (businessId) loadTransactions(businessId)
    } else toast.error(d.error || "Error")
    setRedeeming(false)
  }

  async function handleAddBenefit() {
    if (!newBenefit.name || !newBenefit.pointsCost) { toast.error("Completa nombre y puntos"); return }
    setSavingBenefit(true)
    const r = await fetch(`/api/businesses/${businessId}/loyalty/benefits`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newBenefit, pointsCost: Number(newBenefit.pointsCost) }),
    })
    if (r.ok) { toast.success("Beneficio creado"); setNewBenefit({ name: "", description: "", pointsCost: "", category: "general" }); setShowBenefitForm(false); if (businessId) loadBenefits(businessId) }
    else toast.error("Error al crear")
    setSavingBenefit(false)
  }

  async function handleDeleteBenefit(id: string) {
    await fetch(`/api/businesses/${businessId}/loyalty/benefits/${id}`, { method: "DELETE" })
    toast.success("Beneficio eliminado"); if (businessId) loadBenefits(businessId)
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    const r = await fetch(`/api/businesses/${businessId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
    })
    if (r.ok) toast.success("Configuración guardada"); else toast.error("Error")
    setSavingSettings(false)
  }

  const inp = "w-full h-10 rounded-xl px-3 text-sm outline-none font-medium"
  const inpStyle = { background: INPUT_BG, border: `1px solid ${BORDER}`, color: NAVY }
  const card = { borderRadius: 16, border: BORDER, background: CARD, overflow: "hidden" as const }
  const cardPad = { padding: "20px" }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(56,189,248,0.1)", border: `1px solid rgba(56,189,248,0.2)` }}>
          <QrCode className="w-5 h-5" style={{ color: ACCENT }} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Fidelización</h1>
          <p className="text-sm" style={{ color: MUTED }}>Puntos, beneficios y tarjeta QR del cliente</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(13,27,42,0.05)", border: BORDER }}>
        {([
          { key: "scan", label: "Escanear", icon: ScanLine },
          { key: "benefits", label: "Beneficios", icon: Gift },
          { key: "history", label: "Historial", icon: History },
          { key: "settings", label: "Config.", icon: Settings2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === key
              ? { background: ACCENT, color: "#fff" }
              : { color: MUTED }}>
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── SCAN ───────────────────────────────────────────── */}
      {tab === "scan" && (
        <div className="space-y-4">
          <div style={{ ...card }}>
            <div style={{ ...cardPad }}>
              <p className="text-sm font-bold mb-3" style={{ color: NAVY }}>Buscar cliente por RUT o escanear QR</p>
              <div className="flex gap-2">
                <input className={inp} style={inpStyle}
                  placeholder="RUT del cliente (ej: 12345678-9)"
                  value={manualClientId} onChange={e => setManualClientId(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && lookupClient(manualClientId)} />
                <button onClick={() => lookupClient(manualClientId)} disabled={loadingClient}
                  className="px-4 h-10 rounded-xl text-sm font-bold flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
                  style={{ background: ACCENT, color: "#fff" }}>
                  {loadingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                </button>
              </div>
              <p className="text-[11px] mt-2" style={{ color: MUTED2 }}>
                💡 Puedes buscar por RUT o escanear el QR del cliente con la cámara del teléfono.
              </p>
            </div>
          </div>

          {scannedClient && (
            <div style={{ ...card, border: `1.5px solid rgba(56,189,248,0.3)` }}>
              {/* Client header */}
              <div className="p-4 flex items-center gap-3" style={{ background: "rgba(56,189,248,0.06)", borderBottom: `1px solid rgba(56,189,248,0.15)` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg" style={{ background: ACCENT, color: "#fff" }}>
                  {scannedClient.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: NAVY }}>{scannedClient.name} {scannedClient.lastName ?? ""}</p>
                  {scannedClient.rut && <p className="text-xs" style={{ color: MUTED }}>RUT {scannedClient.rut}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black" style={{ color: ACCENT }}>{scannedClient.loyaltyPoints.toLocaleString("es-CL")}</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>puntos</p>
                </div>
                {scannedClient.segment === "VIP" && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(56,189,248,0.1)", color: ACCENT, border: `1px solid rgba(56,189,248,0.3)` }}>VIP</span>
                )}
              </div>

              {scanSuccess && (
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(34,197,94,0.08)", borderBottom: `1px solid rgba(34,197,94,0.15)` }}>
                  <Check className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-semibold text-green-700">{scanSuccess}</p>
                </div>
              )}

              <div className="p-4 space-y-4">
                {/* Earn */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>Sumar puntos por cobro</p>
                  <input type="number" min="0" className={inp} style={inpStyle}
                    placeholder="Monto cobrado ($)" value={earnAmount}
                    onChange={e => setEarnAmount(e.target.value)} />
                  <input className={inp} style={inpStyle}
                    placeholder="Descripción (opcional)" value={earnDesc}
                    onChange={e => setEarnDesc(e.target.value)} />
                  <button onClick={handleEarn} disabled={earning || !earnAmount}
                    className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{ background: ACCENT, color: "#fff" }}>
                    {earning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sumar puntos"}
                  </button>
                </div>

                {/* Redeem */}
                {benefits.filter(b => b.isActive).length > 0 && (
                  <div className="space-y-2 pt-3" style={{ borderTop: BORDER }}>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>Canjear beneficio</p>
                    <select className={inp} style={{ ...inpStyle, appearance: "none" as const }}
                      value={redeemBenefitId} onChange={e => setRedeemBenefitId(e.target.value)}>
                      <option value="">Seleccionar beneficio…</option>
                      {benefits.filter(b => b.isActive).map(b => (
                        <option key={b.id} value={b.id} disabled={scannedClient.loyaltyPoints < b.pointsCost}>
                          {b.name} — {b.pointsCost} pts{scannedClient.loyaltyPoints < b.pointsCost ? " (sin puntos)" : ""}
                        </option>
                      ))}
                    </select>
                    <button onClick={handleRedeem} disabled={redeeming || !redeemBenefitId}
                      className="w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                      style={{ background: "rgba(13,27,42,0.06)", color: NAVY, border: BORDER }}>
                      {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar canje"}
                    </button>
                  </div>
                )}

                <div className="pt-2" style={{ borderTop: BORDER }}>
                  <a href={`/loyalty/${scannedClient.id}`} target="_blank"
                    className="text-xs font-semibold flex items-center gap-1.5" style={{ color: ACCENT }}>
                    <QrCode className="w-3.5 h-3.5" />
                    Ver tarjeta del cliente →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BENEFITS ───────────────────────────────────────── */}
      {tab === "benefits" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: NAVY }}>{benefits.length} beneficio{benefits.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowBenefitForm(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 h-8 rounded-lg"
              style={{ background: "rgba(56,189,248,0.1)", color: ACCENT, border: `1px solid rgba(56,189,248,0.2)` }}>
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          </div>

          {showBenefitForm && (
            <div style={{ ...card, border: `1.5px solid rgba(56,189,248,0.3)` }}>
              <div style={cardPad} className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>Nuevo beneficio</p>
                <input className={inp} style={inpStyle} placeholder="Nombre (ej: 50% descuento cancha)"
                  value={newBenefit.name} onChange={e => setNewBenefit(b => ({ ...b, name: e.target.value }))} />
                <input className={inp} style={inpStyle} placeholder="Descripción (opcional)"
                  value={newBenefit.description} onChange={e => setNewBenefit(b => ({ ...b, description: e.target.value }))} />
                <div className="flex gap-2">
                  <input type="number" min="1" className={`${inp} flex-1`} style={inpStyle} placeholder="Puntos requeridos"
                    value={newBenefit.pointsCost} onChange={e => setNewBenefit(b => ({ ...b, pointsCost: e.target.value }))} />
                  <select className={`${inp} flex-1`} style={{ ...inpStyle, appearance: "none" as const }}
                    value={newBenefit.category} onChange={e => setNewBenefit(b => ({ ...b, category: e.target.value }))}>
                    {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddBenefit} disabled={savingBenefit}
                    className="flex-1 h-10 rounded-xl text-sm font-bold" style={{ background: ACCENT, color: "#fff" }}>
                    {savingBenefit ? "Guardando…" : "Crear beneficio"}
                  </button>
                  <button onClick={() => setShowBenefitForm(false)}
                    className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: INPUT_BG, border: BORDER }}>
                    <X className="w-4 h-4" style={{ color: MUTED }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {benefits.length === 0 && !showBenefitForm && (
            <div style={card} className="py-10 text-center">
              <Gift className="w-10 h-10 mx-auto mb-3" style={{ color: MUTED2 }} />
              <p className="text-sm" style={{ color: MUTED }}>Aún no hay beneficios. Agrega el primero.</p>
            </div>
          )}

          {benefits.map(b => (
            <div key={b.id} style={card} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{b.name}</p>
                  {!b.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: INPUT_BG, color: MUTED }}>inactivo</span>}
                </div>
                {b.description && <p className="text-xs mt-0.5 truncate" style={{ color: MUTED }}>{b.description}</p>}
                <p className="text-xs mt-0.5" style={{ color: MUTED2 }}>
                  {CATEGORY_OPTIONS.find(c => c.value === b.category)?.label} · <span className="font-semibold">{b.pointsCost} pts</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => fetch(`/api/businesses/${businessId}/loyalty/benefits/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !b.isActive }) }).then(() => loadBenefits(businessId!))}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold"
                  style={{ background: INPUT_BG, color: b.isActive ? MUTED : ACCENT, border: BORDER }}>
                  {b.isActive ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => handleDeleteBenefit(b.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                  style={{ color: MUTED2 }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── HISTORY ────────────────────────────────────────── */}
      {tab === "history" && (
        <div style={card}>
          {loadingTx ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: ACCENT }} /></div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <History className="w-10 h-10 mx-auto mb-3" style={{ color: MUTED2 }} />
              <p className="text-sm" style={{ color: MUTED }}>Aún no hay transacciones</p>
            </div>
          ) : (
            <div>
              {transactions.map((tx, i) => (
                <div key={tx.id} className="px-4 py-3.5 flex items-center gap-3"
                  style={{ borderBottom: i < transactions.length - 1 ? BORDER : undefined }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black"
                    style={{ background: tx.type === "EARN" ? "rgba(34,197,94,0.1)" : "rgba(251,146,60,0.1)", color: tx.type === "EARN" ? "#16a34a" : "#ea580c" }}>
                    {tx.type === "EARN" ? "+" : "−"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{tx.client.name} {tx.client.lastName ?? ""}</p>
                    <p className="text-xs truncate" style={{ color: MUTED }}>{tx.description}</p>
                    {tx.staffName && <p className="text-[10px]" style={{ color: MUTED2 }}>por {tx.staffName}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black" style={{ color: tx.type === "EARN" ? "#16a34a" : "#ea580c" }}>
                      {tx.type === "EARN" ? "+" : ""}{tx.points} pts
                    </p>
                    <p className="text-[10px]" style={{ color: MUTED2 }}>
                      {new Date(tx.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS ───────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="space-y-4">
          <div style={card}>
            <div style={cardPad} className="space-y-4">
              <p className="text-sm font-bold" style={{ color: NAVY }}>Configuración de puntos</p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                  Pesos por punto
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" className={inp} style={inpStyle}
                    value={settings.loyaltyPesosPerPoint}
                    onChange={e => setSettings(s => ({ ...s, loyaltyPesosPerPoint: Number(e.target.value) }))} />
                  <span className="text-xs whitespace-nowrap" style={{ color: MUTED }}>$ por 1 punto</span>
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: MUTED2 }}>
                  Ej: 100 → el cliente gana 1 punto por cada $100 cobrados
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                  Umbral VIP (puntos)
                </label>
                <input type="number" min="1" className={inp} style={inpStyle}
                  value={settings.loyaltyVipThreshold}
                  onChange={e => setSettings(s => ({ ...s, loyaltyVipThreshold: Number(e.target.value) }))} />
                <p className="text-[11px] mt-1.5" style={{ color: MUTED2 }}>
                  Al acumular este total, el cliente pasa automáticamente a segmento VIP
                </p>
              </div>

              <button onClick={handleSaveSettings} disabled={savingSettings}
                className="h-10 px-6 rounded-xl text-sm font-bold"
                style={{ background: ACCENT, color: "#fff" }}>
                {savingSettings ? "Guardando…" : "Guardar configuración"}
              </button>
            </div>
          </div>

          <div style={card}>
            <div style={cardPad} className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Cómo funciona</p>
              {[
                ["1.", "El cliente va a agendamok.cl/loyalty/[su-id] y guarda la página en su teléfono"],
                ["2.", "Al pagar, muestra el QR en recepción"],
                ["3.", "El recepcionista busca el ID aquí y registra el cobro"],
                ["4.", "Los puntos se suman automáticamente según el monto"],
                ["5.", "El cliente puede ver sus beneficios disponibles en su tarjeta"],
              ].map(([n, t]) => (
                <div key={n} className="flex gap-2 text-xs" style={{ color: MUTED }}>
                  <span className="font-bold flex-shrink-0" style={{ color: ACCENT }}>{n}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
