"use client"
import React, { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Plus, X, ChevronDown, Pencil, Trash2, User, TrendingUp, Calendar } from "lucide-react"
import { toast } from "sonner"

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

type FeeRule = {
  id?: string
  name: string
  days: number[]
  startTime: string
  endTime: string
  classPrice: number
  price: number // arriendo al club (COURT_FEE) o 0
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
  clubEarns: number
  coachPaid: boolean
}

type Report = {
  coach: { id: string; name: string; paymentType: string; commissionPercent: number | null; color: string }
  period: { year: number; month: number }
  summary: { totalSessions: number; totalHours: number; totalRevenue: number; totalCoachEarns: number; totalCoachPays: number; totalClubEarns: number }
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
  const [photo, setPhoto] = useState(initial?.photo ?? "")
  const [color, setColor] = useState(initial?.color ?? "#38bdf8")
  const [paymentType, setPaymentType] = useState<"COMMISSION" | "COURT_FEE">(initial?.paymentType ?? "COMMISSION")
  const [commissionPercent, setCommissionPercent] = useState<string>(String(initial?.commissionPercent ?? ""))
  const [feeRules, setFeeRules] = useState<FeeRule[]>(initial?.feeRules ?? [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const r = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (r.ok) setPhoto(d.url)
      else toast.error(d.error || "Error al subir imagen")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  function addRule() {
    setFeeRules(r => [...r, { name: "Horario Valle", days: [1,2,3,4,5], startTime: "08:00", endTime: "18:00", classPrice: 0, price: 0 }])
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
        photo: photo || null,
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
      {/* Foto de perfil */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: photo ? "transparent" : color, border: "2px solid rgba(13,27,42,0.1)" }}>
          {photo
            ? <img src={photo} alt="foto" className="w-full h-full object-cover" />
            : <span className="text-2xl font-black text-white">{name ? name[0].toUpperCase() : "?"}</span>}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            </div>
          )}
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-3 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: "rgba(13,27,42,0.06)", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }}>
            {uploading ? "Subiendo…" : photo ? "Cambiar foto" : "Subir foto"}
          </button>
          {photo && (
            <button type="button" onClick={() => setPhoto("")}
              className="block mt-1.5 text-xs" style={{ color: "rgba(220,38,38,0.6)" }}>
              Quitar foto
            </button>
          )}
          <p className="text-xs mt-1" style={{ color: "rgba(13,27,42,0.35)" }}>JPG, PNG o WebP · máx 5MB</p>
        </div>
      </div>

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

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.5)" }}>Tarifas de clase por horario</label>
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
              <div className={`grid gap-2 ${paymentType === "COURT_FEE" ? "grid-cols-4" : "grid-cols-3"}`}>
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
                  <label className="block text-xs mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>Precio clase/hr</label>
                  <input type="number" value={rule.classPrice || ""} placeholder="0"
                    onChange={e => updateRule(i, "classPrice", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                    style={{ background: "#fff", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
                </div>
                {paymentType === "COURT_FEE" && (
                  <div>
                    <label className="block text-xs mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>Arriendo club/hr</label>
                    <input type="number" value={rule.price || ""} placeholder="0"
                      onChange={e => updateRule(i, "price", parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg px-2 py-1.5 text-sm outline-none"
                      style={{ background: "#fff", border: "1px solid rgba(13,27,42,0.12)", color: "#0d1b2a" }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({})

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/businesses/${businessId}/club-coaches/${coach.id}/report?year=${y}&month=${m}`)
      const data = await r.json()
      setReport(data)
      const map: Record<string, boolean> = {}
      for (const s of data.sessions ?? []) map[s.id] = s.coachPaid
      setPaidMap(map)
    } finally { setLoading(false) }
  }, [businessId, coach.id])

  async function togglePaid(sessionId: string) {
    const next = !paidMap[sessionId]
    setPaidMap(prev => ({ ...prev, [sessionId]: next }))
    await fetch(`/api/businesses/${businessId}/court-bookings/${sessionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coachPaid: next }),
    })
  }

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
                <div className="rounded-xl p-4" style={{ background: "rgba(201,168,76,0.08)", border: "1.5px solid rgba(201,168,76,0.3)" }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>
                    {isPaying ? "Coach paga al club" : "Coach recibe"}
                  </p>
                  <p className="text-2xl font-black" style={{ color: "#C9A84C" }}>
                    {isPaying ? fmt(report.summary.totalCoachPays) : fmt(report.summary.totalCoachEarns)}
                  </p>
                  {!isPaying && (
                    <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>{coach.commissionPercent}% del precio de clase</p>
                  )}
                </div>
                <div className="rounded-xl p-4" style={{ background: "rgba(56,189,248,0.08)", border: "1.5px solid rgba(56,189,248,0.3)" }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>Club recibe</p>
                  <p className="text-2xl font-black" style={{ color: "#0ea5e9" }}>{fmt(report.summary.totalClubEarns)}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>
                    {isPaying ? "arriendo de cancha" : `${100 - (coach.commissionPercent ?? 0)}% del precio de clase`}
                  </p>
                </div>
              </div>

              {/* Sessions table */}
              {report.sessions.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(13,27,42,0.45)" }}>Detalle de sesiones</p>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(13,27,42,0.08)" }}>
                    {report.sessions.map((s, i) => {
                      const paid = paidMap[s.id] ?? s.coachPaid
                      return (
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
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-sm font-bold" style={{ color: "#0d1b2a" }}>{fmt(s.price)}</p>
                              <p className="text-xs font-bold" style={{ color: "#C9A84C" }}>
                                coach {isPaying ? `−${fmt(s.coachPays)}` : `+${fmt(s.coachEarns)}`}
                              </p>
                              <p className="text-xs font-bold" style={{ color: "#0ea5e9" }}>club +{fmt(s.clubEarns)}</p>
                            </div>
                            {report.coach.id && (
                              <div className="flex flex-col gap-1">
                                <button onClick={() => !paid && togglePaid(s.id)}
                                  className="flex-shrink-0 h-6 px-2.5 rounded-md text-[11px] font-bold transition-all"
                                  style={paid
                                    ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.4)", color: "#15803d" }
                                    : { background: "transparent", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.3)", cursor: "default" }}>
                                  ✓ Pagada
                                </button>
                                <button onClick={() => paid && togglePaid(s.id)}
                                  className="flex-shrink-0 h-6 px-2.5 rounded-md text-[11px] font-bold transition-all"
                                  style={!paid
                                    ? { background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#92400e" }
                                    : { background: "transparent", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.3)", cursor: "default" }}>
                                  Pendiente
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-black flex-shrink-0 overflow-hidden"
            style={{ background: coach.color }}>
            {coach.photo
              ? <img src={coach.photo} alt={coach.name} className="w-full h-full object-cover" />
              : coach.name[0]}
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
      <Portal>
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
      </Portal>
      )}

      {/* Modal reporte */}
      {reportCoach && (
      <Portal>
        <ReportModal businessId={businessId} coach={reportCoach} onClose={() => setReportCoach(null)} />
      </Portal>
      )}
    </div>
  )
}
