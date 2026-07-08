"use client"
import React, { useState, useEffect, useCallback } from "react"
import { Plus, X, ChevronDown, Pencil, Trash2, User, TrendingUp, Calendar } from "lucide-react"
import { toast } from "sonner"

type FeeRule = {
  id?: string
  name: string
  days: number[]
  startTime: string
  endTime: string
  price: number
}

type Coach = {
  id: string
  name: string
  email: string | null
  phone: string | null
  photo: string | null
  color: string
  paymentType: "COMMISSION" | "COURT_FEE"
  commissionPercent: number | null
  isActive: boolean
  feeRules: FeeRule[]
}

type ReportSession = {
  id: string
  startTime: string
  endTime: string
  durationMinutes: number
  courtName: string
  clientName: string | null
  price: number
  status: string
  coachEarns: number
  coachPays: number
}

type Report = {
  coach: { id: string; name: string; paymentType: string; commissionPercent: number | null; color: string }
  period: { year: number; month: number }
  summary: { totalSessions: number; totalHours: number; totalRevenue: number; totalCoachEarns: number; totalCoachPays: number }
  sessions: ReportSession[]
}

const DAY_LABELS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"]

function ModalScroller({ children }: { children: React.ReactNode }) {
  return <div className="p-5">{children}</div>
}
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function fmt(n: number) { return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }) }
function fmtHours(h: number) { return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m` }

function utcTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}
function utcDateShort(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`
}

// ─── Formulario de entrenador ────────────────────────────────────────────────
function CoachForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Coach>
  onSave: (data: Omit<Coach, "id" | "isActive">) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [email, setEmail] = useState(initial?.email ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [color, setColor] = useState(initial?.color ?? "#38bdf8")
  const [paymentType, setPaymentType] = useState<"COMMISSION" | "COURT_FEE">(initial?.paymentType ?? "COMMISSION")
  const [commissionPercent, setCommissionPercent] = useState<string>(String(initial?.commissionPercent ?? ""))
  const [feeRules, setFeeRules] = useState<FeeRule[]>(initial?.feeRules ?? [])
  const [saving, setSaving] = useState(false)

  function addRule() {
    setFeeRules(r => [...r, { name: "Horario Valle", days: [1,2,3,4,5], startTime: "08:00", endTime: "18:00", price: 5000 }])
  }
  function removeRule(i: number) { setFeeRules(r => r.filter((_, idx) => idx !== i)) }
  function updateRule(i: number, field: keyof FeeRule, value: unknown) {
    setFeeRules(r => r.map((rule, idx) => idx === i ? { ...rule, [field]: value } : rule))
  }
  function toggleDay(ruleIdx: number, day: number) {
    setFeeRules(r => r.map((rule, idx) => {
      if (idx !== ruleIdx) return rule
      const days = rule.days.includes(day) ? rule.days.filter(d => d !== day) : [...rule.days, day]
      return { ...rule, days }
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error("El nombre es requerido"); return }
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        photo: null,
        color,
        paymentType,
        commissionPercent: paymentType === "COMMISSION" ? (parseFloat(commissionPercent) || null) : null,
        feeRules,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Datos básicos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>Teléfono</label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>Color en calendario</label>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-10 h-9 rounded-lg cursor-pointer border-0 p-0.5"
              style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.12)" }} />
            <span className="text-sm font-mono" style={{ color: "#0d1b2a" }}>{color}</span>
          </div>
        </div>
      </div>

      {/* Tipo de pago */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(13,27,42,0.5)" }}>Tipo de pago</label>
        <div className="flex gap-2">
          {[
            { val: "COMMISSION", label: "Comisión", desc: "El club paga % al coach" },
            { val: "COURT_FEE", label: "Arriendo cancha", desc: "El coach paga al club" },
          ].map(opt => (
            <button key={opt.val} type="button"
              onClick={() => setPaymentType(opt.val as "COMMISSION" | "COURT_FEE")}
              className="flex-1 rounded-xl p-3 text-left transition-all"
              style={paymentType === opt.val
                ? { background: "rgba(201,168,76,0.1)", border: "1.5px solid #C9A84C" }
                : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)" }}>
              <p className="text-sm font-bold" style={{ color: paymentType === opt.val ? "#C9A84C" : "#0d1b2a" }}>{opt.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Config según tipo */}
      {paymentType === "COMMISSION" && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>Porcentaje de comisión (%)</label>
          <input value={commissionPercent} onChange={e => setCommissionPercent(e.target.value)}
            type="number" min="0" max="100" step="0.1"
            placeholder="Ej: 30"
            className="w-40 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
        </div>
      )}

      {paymentType === "COURT_FEE" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.5)" }}>Tarifas por horario</label>
            <button type="button" onClick={addRule}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(13,27,42,0.06)", color: "#0d1b2a", border: "1px solid rgba(13,27,42,0.12)" }}>
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>
          <div className="space-y-3">
            {feeRules.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: "rgba(13,27,42,0.35)" }}>Sin tarifas configuradas</p>
            )}
            {feeRules.map((rule, i) => (
              <div key={i} className="rounded-xl p-3 space-y-3" style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.08)" }}>
                <div className="flex items-center gap-2">
                  <input value={rule.name} onChange={e => updateRule(i, "name", e.target.value)}
                    placeholder="Nombre (ej. Valle, Punta)"
                    className="flex-1 rounded-lg px-2 py-1.5 text-sm outline-none"
                    style={{ background: "#fff", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
                  <button type="button" onClick={() => removeRule(i)}>
                    <X className="w-4 h-4" style={{ color: "rgba(13,27,42,0.35)" }} />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {DAY_LABELS.map((d, di) => (
                    <button key={di} type="button" onClick={() => toggleDay(i, di)}
                      className="w-8 h-8 rounded-full text-xs font-bold transition-all"
                      style={rule.days.includes(di)
                        ? { background: "#0d1b2a", color: "#C9A84C" }
                        : { background: "rgba(13,27,42,0.06)", color: "rgba(13,27,42,0.4)" }}>
                      {d}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>Desde</label>
                    <input type="time" value={rule.startTime} onChange={e => updateRule(i, "startTime", e.target.value)}
                      className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                      style={{ background: "#fff", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>Hasta</label>
                    <input type="time" value={rule.endTime} onChange={e => updateRule(i, "endTime", e.target.value)}
                      className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                      style={{ background: "#fff", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>$/hora</label>
                    <input type="number" value={rule.price} onChange={e => updateRule(i, "price", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                      style={{ background: "#fff", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: "rgba(13,27,42,0.06)", color: "#0d1b2a", border: "1px solid rgba(13,27,42,0.1)" }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: "#0d1b2a", color: "#C9A84C", border: "1px solid #C9A84C", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  )
}

// ─── Modal reporte mensual ────────────────────────────────────────────────────
function ReportModal({ businessId, coach, onClose }: { businessId: string; coach: Coach; onClose: () => void }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/businesses/${businessId}/club-coaches/${coach.id}/report?year=${y}&month=${m}`)
      const data = await r.json()
      setReport(data)
    } finally { setLoading(false) }
  }, [businessId, coach.id])

  useEffect(() => { load(year, month) }, [load, year, month])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
  }

  const isPaying = coach.paymentType === "COURT_FEE"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col" style={{ background: "#fff", border: "1px solid rgba(13,27,42,0.1)", maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: "#0d1b2a", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black" style={{ background: coach.color, color: "#fff" }}>
              {coach.name[0]}
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide" style={{ color: "#C9A84C" }}>Reporte mensual</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{coach.name}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)" }} /></button>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-3" style={{ background: "rgba(13,27,42,0.03)", borderBottom: "1px solid rgba(13,27,42,0.06)" }}>
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-black/5">
            <ChevronDown className="w-4 h-4 rotate-90" style={{ color: "#0d1b2a" }} />
          </button>
          <span className="text-sm font-bold" style={{ color: "#0d1b2a" }}>{MONTHS[month - 1]} {year}</span>
          <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-black/5">
            <ChevronDown className="w-4 h-4 -rotate-90" style={{ color: "#0d1b2a" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {loading && <p className="text-center text-sm py-8" style={{ color: "rgba(13,27,42,0.4)" }}>Cargando…</p>}
          {!loading && report && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.07)" }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>Sesiones</p>
                  <p className="text-2xl font-black" style={{ color: "#0d1b2a" }}>{report.summary.totalSessions}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>{fmtHours(report.summary.totalHours)} en cancha</p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.07)" }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>Facturación</p>
                  <p className="text-2xl font-black" style={{ color: "#0d1b2a" }}>{fmt(report.summary.totalRevenue)}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>generado en canchas</p>
                </div>
                <div className="col-span-2 rounded-xl p-4" style={{ background: isPaying ? "rgba(56,189,248,0.08)" : "rgba(201,168,76,0.08)", border: `1.5px solid ${isPaying ? "rgba(56,189,248,0.3)" : "rgba(201,168,76,0.3)"}` }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>
                    {isPaying ? "Coach paga al club" : "Club paga al coach"}
                  </p>
                  <p className="text-3xl font-black" style={{ color: isPaying ? "#0ea5e9" : "#C9A84C" }}>
                    {isPaying ? fmt(report.summary.totalCoachPays) : fmt(report.summary.totalCoachEarns)}
                  </p>
                  {!isPaying && (
                    <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>{coach.commissionPercent}% de comisión</p>
                  )}
                </div>
              </div>

              {/* Sessions table */}
              {report.sessions.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(13,27,42,0.45)" }}>Detalle de sesiones</p>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(13,27,42,0.08)" }}>
                    {report.sessions.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3"
                        style={{ borderTop: i > 0 ? "1px solid rgba(13,27,42,0.06)" : undefined, background: i % 2 === 0 ? "#fff" : "rgba(13,27,42,0.02)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold" style={{ color: "#0d1b2a" }}>
                            {utcDateShort(s.startTime)} · {utcTime(s.startTime)}–{utcTime(s.endTime)}
                          </p>
                          <p className="text-xs" style={{ color: "rgba(13,27,42,0.45)" }}>
                            {s.courtName}{s.clientName ? ` · ${s.clientName}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: "#0d1b2a" }}>{fmt(s.price)}</p>
                          <p className="text-xs font-bold" style={{ color: isPaying ? "#0ea5e9" : "#C9A84C" }}>
                            {isPaying ? `−${fmt(s.coachPays)}` : `+${fmt(s.coachEarns)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.sessions.length === 0 && (
                <p className="text-center text-sm py-6" style={{ color: "rgba(13,27,42,0.35)" }}>Sin sesiones en este período</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab principal ─────────────────────────────────────────────────────────
export default function CoachesTab({ businessId }: { businessId: string }) {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editCoach, setEditCoach] = useState<Coach | null>(null)
  const [reportCoach, setReportCoach] = useState<Coach | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/businesses/${businessId}/club-coaches`)
      const data = await r.json()
      setCoaches(data.coaches ?? [])
    } finally { setLoading(false) }
  }, [businessId])

  useEffect(() => { load() }, [load])

  async function handleCreate(data: Omit<Coach, "id" | "isActive">) {
    const r = await fetch(`/api/businesses/${businessId}/club-coaches`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!r.ok) { toast.error("Error al crear entrenador"); return }
    toast.success("Entrenador creado")
    setModal(null)
    load()
  }

  async function handleEdit(data: Omit<Coach, "id" | "isActive">) {
    if (!editCoach) return
    const r = await fetch(`/api/businesses/${businessId}/club-coaches/${editCoach.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, feeRules: data.feeRules }),
    })
    if (!r.ok) { toast.error("Error al actualizar entrenador"); return }
    toast.success("Entrenador actualizado")
    setModal(null)
    setEditCoach(null)
    load()
  }

  async function handleToggleActive(coach: Coach) {
    await fetch(`/api/businesses/${businessId}/club-coaches/${coach.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !coach.isActive }),
    })
    load()
  }

  async function handleDelete(coach: Coach) {
    if (!confirm(`¿Eliminar a ${coach.name}? Sus reservas no se perderán.`)) return
    const r = await fetch(`/api/businesses/${businessId}/club-coaches/${coach.id}`, { method: "DELETE" })
    if (!r.ok) { toast.error("Error al eliminar"); return }
    toast.success("Entrenador eliminado")
    load()
  }

  return (
    <div className="space-y-4">
      {/* Header acción */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: "#0d1b2a" }}>Entrenadores</p>
          <p className="text-xs" style={{ color: "rgba(13,27,42,0.45)" }}>{coaches.filter(c => c.isActive).length} activos</p>
        </div>
        <button onClick={() => setModal("create")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: "#0d1b2a", color: "#C9A84C", border: "1px solid #C9A84C" }}>
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {/* Lista */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(13,27,42,0.06)" }} />
          ))}
        </div>
      )}
      {!loading && coaches.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)" }}>
            <User className="w-7 h-7" style={{ color: "rgba(13,27,42,0.25)" }} />
          </div>
          <p className="text-sm font-bold" style={{ color: "#0d1b2a" }}>Sin entrenadores</p>
          <p className="text-xs" style={{ color: "rgba(13,27,42,0.4)" }}>Agrega el primer entrenador del club</p>
        </div>
      )}
      {!loading && coaches.map(coach => (
        <div key={coach.id} className="rounded-2xl p-4 flex items-center gap-4 transition-all"
          style={{ background: "#fff", border: "1px solid rgba(13,27,42,0.08)", opacity: coach.isActive ? 1 : 0.55 }}>
          {/* Avatar color */}
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-black flex-shrink-0"
            style={{ background: coach.color }}>
            {coach.name[0]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black" style={{ color: "#0d1b2a" }}>{coach.name}</p>
              {!coach.isActive && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(13,27,42,0.07)", color: "rgba(13,27,42,0.4)" }}>Inactivo</span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>
              {coach.paymentType === "COMMISSION"
                ? `Comisión ${coach.commissionPercent ?? 0}%`
                : `Arriendo cancha · ${coach.feeRules.length} tarifa${coach.feeRules.length !== 1 ? "s" : ""}`}
            </p>
            {(coach.email || coach.phone) && (
              <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.35)" }}>
                {[coach.email, coach.phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1">
            <button onClick={() => setReportCoach(coach)} title="Reporte mensual"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-black/5">
              <TrendingUp className="w-4 h-4" style={{ color: "rgba(13,27,42,0.5)" }} />
            </button>
            <button onClick={() => { setEditCoach(coach); setModal("edit") }} title="Editar"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-black/5">
              <Pencil className="w-4 h-4" style={{ color: "rgba(13,27,42,0.5)" }} />
            </button>
            <button onClick={() => handleToggleActive(coach)} title={coach.isActive ? "Desactivar" : "Activar"}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-black/5">
              <Calendar className="w-4 h-4" style={{ color: coach.isActive ? "#22c55e" : "rgba(13,27,42,0.3)" }} />
            </button>
            <button onClick={() => handleDelete(coach)} title="Eliminar"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-50">
              <Trash2 className="w-4 h-4" style={{ color: "rgba(220,38,38,0.6)" }} />
            </button>
          </div>
        </div>
      ))}

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 px-4" style={{ background: "rgba(0,0,0,0.45)", overflowY: "auto" }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden flex-shrink-0" style={{ background: "#fff", border: "1px solid rgba(13,27,42,0.1)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: "#0d1b2a", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
              <p className="text-sm font-black uppercase tracking-wide" style={{ color: "#C9A84C" }}>
                {modal === "create" ? "Nuevo entrenador" : "Editar entrenador"}
              </p>
              <button onClick={() => { setModal(null); setEditCoach(null) }}>
                <X className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            </div>
            <ModalScroller>
              <CoachForm
                initial={modal === "edit" && editCoach ? editCoach : undefined}
                onSave={modal === "create" ? handleCreate : handleEdit}
                onCancel={() => { setModal(null); setEditCoach(null) }}
              />
            </ModalScroller>
          </div>
        </div>
      )}

      {/* Modal reporte */}
      {reportCoach && (
        <ReportModal businessId={businessId} coach={reportCoach} onClose={() => setReportCoach(null)} />
      )}
    </div>
  )
}
