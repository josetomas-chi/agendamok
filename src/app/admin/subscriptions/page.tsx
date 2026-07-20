"use client"
import { useEffect, useState } from "react"
import { CreditCard, Save } from "lucide-react"
import { toast } from "sonner"

const PLANS = ["STARTER", "NEGOCIO", "PRO"]
const STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "PAUSED"]

const planColor: Record<string, string> = {
  STARTER: "bg-white/10 text-white/60 border border-white/10",
  NEGOCIO: "bg-amber-500/20 text-amber-400 border border-amber-400/30",
  PRO: "bg-sky-500/20 text-sky-400 border border-sky-400/30",
}
const statusColor: Record<string, string> = {
  TRIALING: "bg-amber-400/15 text-amber-400 border border-amber-400/30",
  ACTIVE: "bg-emerald-500/15 text-emerald-400 border border-emerald-400/30",
  PAST_DUE: "bg-red-500/15 text-red-400 border border-red-400/30",
  CANCELED: "bg-white/10 text-white/40 border border-white/10",
  PAUSED: "bg-orange-500/15 text-orange-400 border border-orange-400/30",
}
const statusLabel: Record<string, string> = {
  TRIALING: "Periodo de prueba", ACTIVE: "Activa", PAST_DUE: "Vencida", CANCELED: "Cancelada", PAUSED: "Pausada",
}

type Sub = {
  id: string; plan: string; status: string; trialEndsAt: string | null; currentPeriodEnd: string | null
  business: { name: string; owner: { email: string } }
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, { plan: string; status: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/subscriptions")
      .then(r => r.json())
      .then(d => setSubs(d.subs || []))
      .finally(() => setLoading(false))
  }, [])

  function startEdit(s: Sub) {
    setEditing(e => ({ ...e, [s.id]: { plan: s.plan, status: s.status } }))
  }

  async function save(s: Sub) {
    const e = editing[s.id]
    if (!e) return
    setSaving(s.id)
    const r = await fetch(`/api/admin/subscriptions/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: e.plan, status: e.status }),
    })
    if (r.ok) {
      setSubs(prev => prev.map(x => x.id === s.id ? { ...x, plan: e.plan, status: e.status } : x))
      setEditing(prev => { const n = { ...prev }; delete n[s.id]; return n })
      toast.success(`${s.business.name} → ${e.plan} · ${statusLabel[e.status]}`)
    } else {
      toast.error("Error al guardar")
    }
    setSaving(null)
  }

  const active = subs.filter(s => s.status === "ACTIVE").length
  const trialing = subs.filter(s => s.status === "TRIALING").length
  const mrr = subs.filter(s => s.status === "ACTIVE").reduce((acc, s) =>
    acc + (s.plan === "STARTER" ? 9900 : s.plan === "NEGOCIO" ? 24900 : 39900), 0)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suscripciones</h1>
          <p className="page-subtitle">{subs.length} en total</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "MRR estimado", value: `$${mrr.toLocaleString("es-CL")}` },
          { label: "Activas", value: active },
          { label: "En prueba", value: trialing },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "oklch(0.18 0.02 260)" }}>
            <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-2 text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
        {loading ? (
          <div className="py-16 text-center text-white/30 text-sm">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.07]">
              <tr>
                {["Negocio", "Plan", "Estado", "Fin prueba", "Renovación", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-white/40 text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-white/30">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />No hay suscripciones
                </td></tr>
              ) : subs.map((s, i) => {
                const e = editing[s.id]
                const isDirty = e && (e.plan !== s.plan || e.status !== s.status)
                return (
                  <tr key={s.id} onClick={() => !e && startEdit(s)}
                    className={`transition-colors cursor-pointer ${i !== subs.length - 1 ? "border-b border-white/[0.05]" : ""} ${e ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white/90">{s.business.name}</p>
                      <p className="text-xs text-white/40">{s.business.owner.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {e ? (
                        <select value={e.plan} onChange={ev => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], plan: ev.target.value } }))}
                          onClick={ev => ev.stopPropagation()}
                          className="rounded-lg px-2 py-1 text-xs font-semibold bg-white/10 text-white border border-white/20 focus:outline-none focus:border-sky-500">
                          {PLANS.map(p => <option key={p} value={p} className="bg-[#2c2c30] text-white">{p}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColor[s.plan] ?? planColor.STARTER}`}>{s.plan}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e ? (
                        <select value={e.status} onChange={ev => setEditing(prev => ({ ...prev, [s.id]: { ...prev[s.id], status: ev.target.value } }))}
                          onClick={ev => ev.stopPropagation()}
                          className="rounded-lg px-2 py-1 text-xs font-semibold bg-white/10 text-white border border-white/20 focus:outline-none focus:border-sky-500">
                          {STATUSES.map(st => <option key={st} value={st} className="bg-[#2c2c30] text-white">{statusLabel[st]}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[s.status] ?? ""}`}>{statusLabel[s.status] ?? s.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {s.trialEndsAt ? new Date(s.trialEndsAt).toLocaleDateString("es-CL") : "—"}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("es-CL") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {e ? (
                        <div className="flex gap-2" onClick={ev => ev.stopPropagation()}>
                          <button onClick={() => save(s)} disabled={!isDirty || saving === s.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500 text-white disabled:opacity-40 hover:bg-sky-400 transition-colors">
                            <Save className="w-3 h-3" />{saving === s.id ? "..." : "Guardar"}
                          </button>
                          <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[s.id]; return n })}
                            className="px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-white/25">Editar →</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
