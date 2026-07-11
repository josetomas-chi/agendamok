"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useBusiness } from "@/contexts/business-context"
import { Plus, Trophy, ChevronRight, Trash2, X, Tag, CalendarDays } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import TournamentDetail from "./_components/tournament-detail"

type Tournament = {
  id: string; name: string; sport: string | null
  format: "ELIMINATION" | "ROUND_ROBIN" | "GROUP_STAGE" | "LADDER"
  participantType: "INDIVIDUAL" | "PAIR" | "TEAM"
  startDate: string; endDate: string
  maxParticipants: number | null; entryFee: string | null
  status: "DRAFT" | "OPEN" | "IN_PROGRESS" | "FINISHED"
  description: string | null
  _count: { participants: number; matches: number }
}

type CategoryDraft = { name: string; groupCount: string; groupSize: string }
type ScheduleDay = { date: string; startTime: string; endTime: string }

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"
const FORMAT_LABELS = { ELIMINATION: "Eliminación directa", ROUND_ROBIN: "Round Robin", GROUP_STAGE: "Fase de grupos", LADDER: "Escalerilla" }
const TYPE_LABELS = { INDIVIDUAL: "Individual", PAIR: "Parejas", TEAM: "Equipos" }
const STATUS_LABELS = { DRAFT: "Borrador", OPEN: "Inscripciones", IN_PROGRESS: "En curso", FINISHED: "Finalizado" }
const STATUS_COLORS = { DRAFT: "rgba(13,27,42,0.3)", OPEN: "#22c55e", IN_PROGRESS: GOLD, FINISHED: "rgba(13,27,42,0.4)" }
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export default function TournamentsPage() {
  const { businessId } = useBusiness()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "", sport: "",
    format: "ELIMINATION" as "ELIMINATION" | "ROUND_ROBIN" | "GROUP_STAGE" | "LADDER",
    participantType: "INDIVIDUAL" as "INDIVIDUAL" | "PAIR" | "TEAM",
    startDate: "", endDate: "",
    maxParticipants: "", courtCount: "", entryFee: "", description: "",
    groupCount: "2", groupSize: "4", advanceCount: "2",
  })
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([])
  const [categories, setCategories] = useState<CategoryDraft[]>([])
  const [catInput, setCatInput] = useState("")
  const [catGroups, setCatGroups] = useState("2")
  const [catGroupSize, setCatGroupSize] = useState("4")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!businessId) return
    const r = await fetch(`/api/businesses/${businessId}/tournaments`)
    if (r.ok) { const d = await r.json(); setTournaments(d.tournaments || []) }
    setLoading(false)
  }, [businessId])

  useEffect(() => { load() }, [load])

  function addCategory() {
    const name = catInput.trim()
    if (!name || categories.some(c => c.name === name)) return
    setCategories(c => [...c, { name, groupCount: catGroups, groupSize: catGroupSize }])
    setCatInput(""); setCatGroups("2"); setCatGroupSize("4")
  }

  function addScheduleDay() {
    setScheduleDays(d => [...d, { date: "", startTime: "09:00", endTime: "20:00" }])
  }

  function updateScheduleDay(i: number, field: keyof ScheduleDay, value: string) {
    setScheduleDays(days => days.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  function removeScheduleDay(i: number) {
    setScheduleDays(days => days.filter((_, idx) => idx !== i))
  }

  const resetForm = () => {
    setForm({ name: "", sport: "", format: "ELIMINATION", participantType: "INDIVIDUAL", startDate: "", endDate: "", maxParticipants: "", courtCount: "", entryFee: "", description: "", groupCount: "2", groupSize: "4", advanceCount: "2" })
    setScheduleDays([])
    setCategories([])
    setCatInput(""); setCatGroups("2"); setCatGroupSize("4")
  }

  const isGroupStage = form.format === "GROUP_STAGE"
  const sortedDays = [...scheduleDays].filter(d => d.date).sort((a, b) => a.date.localeCompare(b.date))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !form.name || !form.startDate) {
      toast.error("Completa el nombre y la fecha de inicio"); return
    }
    const validDays = scheduleDays.filter(d => d.date && d.startTime && d.endTime)
    const sorted = [...validDays].sort((a, b) => a.date.localeCompare(b.date))
    const endDate = form.endDate || form.startDate
    const startDate = `${form.startDate}T00:00:00`
    const endDateFull = `${endDate}T23:59:00`

    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startDate,
        endDate: endDateFull,
        maxParticipants: isGroupStage && categories.length === 0 && form.groupCount && form.groupSize
          ? Number(form.groupCount) * Number(form.groupSize)
          : (form.maxParticipants ? Number(form.maxParticipants) : null),
        courtCount: form.courtCount ? Number(form.courtCount) : null,
        entryFee: form.entryFee ? Number(form.entryFee) : null,
        groupCount: isGroupStage && categories.length === 0 ? Number(form.groupCount) : null,
        groupSize: isGroupStage && categories.length === 0 ? Number(form.groupSize) : null,
        advanceCount: isGroupStage ? Number(form.advanceCount) : null,
        scheduleDays: sorted.map((d, i) => ({ ...d, sortOrder: i })),
        categories: categories.map((c, i) => ({
          name: c.name, sortOrder: i,
          groupCount: isGroupStage && c.groupCount ? Number(c.groupCount) : null,
          groupSize: isGroupStage && c.groupSize ? Number(c.groupSize) : null,
        })),
      }),
    })
    if (r.ok) {
      const d = await r.json()
      toast.success("Torneo creado")
      setCreateOpen(false)
      resetForm()
      setTournaments(prev => [{ ...d.tournament, _count: { participants: 0, matches: 0 } }, ...prev])
      setSelectedId(d.tournament.id)
    } else {
      const d = await r.json(); toast.error(d.error || "Error al crear")
    }
    setSaving(false)
  }

  async function handleDelete(t: Tournament) {
    if (!confirm(`¿Eliminar "${t.name}"?`)) return
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${t.id}`, { method: "DELETE" })
    if (r.ok) { toast.success("Torneo eliminado"); setTournaments(prev => prev.filter(x => x.id !== t.id)) }
  }

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
  const inputStyle = { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }
  const labelCls = "text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5 block"

  if (selectedId) return (
    <TournamentDetail businessId={businessId!} tournamentId={selectedId} onBack={() => { setSelectedId(null); load() }} />
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)" }}>
            <Trophy className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide" style={{ color: NAVY }}>Torneos</h1>
            <p className="text-xs font-medium" style={{ color: "rgba(13,27,42,0.45)" }}>Individual · Parejas · Equipos</p>
          </div>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all"
          style={{ background: NAVY, border: `1px solid ${GOLD}`, color: GOLD }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.12)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = NAVY }}>
          <Plus className="w-4 h-4" /> Nuevo torneo
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: "rgba(13,27,42,0.3)" }}>Cargando…</div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ border: "1px dashed rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.03)" }}>
          <Trophy className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(201,168,76,0.3)" }} />
          <p className="font-bold text-sm" style={{ color: "rgba(13,27,42,0.4)" }}>No hay torneos todavía</p>
          <p className="text-xs mt-1" style={{ color: "rgba(13,27,42,0.3)" }}>Crea el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tournaments.map(t => (
            <div key={t.id} className="rounded-2xl overflow-hidden cursor-pointer group transition-all"
              style={{ background: "#ffffff", border: "1px solid rgba(201,168,76,0.2)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              onClick={() => setSelectedId(t.id)}>
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[t.status] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-sm uppercase tracking-wide truncate" style={{ color: NAVY }}>{t.name}</p>
                    {t.sport && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(201,168,76,0.12)", color: GOLD }}>{t.sport}</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] font-semibold" style={{ color: "rgba(13,27,42,0.45)" }}>{FORMAT_LABELS[t.format]}</span>
                    <span style={{ color: "rgba(13,27,42,0.25)" }}>·</span>
                    <span className="text-[11px] font-semibold" style={{ color: "rgba(13,27,42,0.45)" }}>{TYPE_LABELS[t.participantType]}</span>
                    <span style={{ color: "rgba(13,27,42,0.25)" }}>·</span>
                    <span className="text-[11px] font-semibold" style={{ color: STATUS_COLORS[t.status] }}>{STATUS_LABELS[t.status]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="hidden md:flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: NAVY }}>{t._count.participants}{t.maxParticipants ? `/${t.maxParticipants}` : ""}</p>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.35)" }}>inscritos</p>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const start = new Date(t.startDate)
                        const end = new Date(t.endDate)
                        const sameDay = start.toDateString() === end.toDateString()
                        return sameDay ? (
                          <p className="text-xs font-bold" style={{ color: NAVY }}>{format(start, "d MMM yyyy", { locale: es })}</p>
                        ) : (
                          <>
                            <p className="text-xs font-bold" style={{ color: NAVY }}>{format(start, "d MMM", { locale: es })}</p>
                            <p className="text-[10px] font-semibold" style={{ color: "rgba(13,27,42,0.4)" }}>→ {format(end, "d MMM yyyy", { locale: es })}</p>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDelete(t) }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    style={{ color: "#ef4444" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{ color: "rgba(13,27,42,0.25)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm() }}>
        <DialogContent className="p-0 gap-0 overflow-hidden" style={{ maxWidth: 540, background: "#ffffff", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20 }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
            <div>
              <p className="font-black text-base uppercase tracking-wide" style={{ color: NAVY }}>Nuevo torneo</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.4)" }}>Completa la información del torneo</p>
            </div>
            <button onClick={() => { setCreateOpen(false); resetForm() }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(13,27,42,0.06)" }}>
              <X className="w-4 h-4" style={{ color: "rgba(13,27,42,0.5)" }} />
            </button>
          </div>

          <form onSubmit={handleCreate} className="p-6 space-y-5 overflow-y-auto max-h-[78vh]">

            {/* Nombre */}
            <div>
              <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Nombre del torneo *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Torneo Pádel Verano 2026"
                className={inputCls} style={inputStyle} required />
            </div>

            {/* Deporte + inscripción */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Deporte</label>
                <input value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))} placeholder="Ej: Pádel"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>
                  Inscripción ($) — {form.participantType === "INDIVIDUAL" ? "por persona" : form.participantType === "PAIR" ? "por pareja" : "por equipo"}
                </label>
                <input type="number" min="0" value={form.entryFee} onChange={e => setForm(f => ({ ...f, entryFee: e.target.value }))} placeholder="0"
                  className={inputCls} style={inputStyle} />
              </div>
            </div>

            {/* Tipo participante */}
            <div>
              <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Tipo de participante</label>
              <div className="grid grid-cols-3 gap-2">
                {(["INDIVIDUAL", "PAIR", "TEAM"] as const).map(type => (
                  <button key={type} type="button" onClick={() => setForm(f => ({ ...f, participantType: type }))}
                    className="rounded-xl py-2.5 text-xs font-bold uppercase tracking-wide transition-all text-center"
                    style={form.participantType === type
                      ? { background: "rgba(201,168,76,0.12)", border: `1.5px solid ${GOLD}`, color: "#8a6520" }
                      : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.5)" }}>
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Formato */}
            <div>
              <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Formato</label>
              <div className="grid grid-cols-2 gap-2">
                {(["ELIMINATION", "ROUND_ROBIN", "GROUP_STAGE", "LADDER"] as const).map(fmt => (
                  <button key={fmt} type="button" onClick={() => setForm(f => ({ ...f, format: fmt }))}
                    className="rounded-xl py-2.5 text-xs font-bold uppercase tracking-wide transition-all text-center"
                    style={form.format === fmt
                      ? { background: "rgba(201,168,76,0.12)", border: `1.5px solid ${GOLD}`, color: "#8a6520" }
                      : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.5)" }}>
                    {FORMAT_LABELS[fmt]}
                  </button>
                ))}
              </div>
            </div>

            {/* ── CATEGORÍAS ── */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.18)" }}>
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" style={{ color: GOLD }} />
                <label className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: NAVY }}>Categorías</label>
                <span className="text-[10px] ml-1" style={{ color: "rgba(13,27,42,0.35)" }}>(opcional — ej: 1ª, 2ª, Sub-12, Open)</span>
              </div>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <span key={cat.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{ background: NAVY, color: GOLD }}>
                      {cat.name}
                      {isGroupStage && <span className="text-[10px] font-normal opacity-70">{cat.groupCount}G × {cat.groupSize}</span>}
                      <button type="button" onClick={() => setCategories(c => c.filter(x => x.name !== cat.name))} className="ml-0.5 opacity-60 hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input value={catInput} onChange={e => setCatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategory() } }}
                  placeholder="Nombre de categoría…"
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
                  style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)", color: NAVY }} />
                {isGroupStage && (
                  <>
                    <select value={catGroups} onChange={e => setCatGroups(e.target.value)}
                      className="rounded-lg px-2 py-1.5 text-xs outline-none"
                      style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)", color: NAVY }}>
                      {[2,3,4,6,8].map(n => <option key={n} value={n}>{n}G</option>)}
                    </select>
                    <input type="number" min="2" max="32" value={catGroupSize} onChange={e => setCatGroupSize(e.target.value)}
                      placeholder="cupo" className="w-16 rounded-lg px-2 py-1.5 text-xs outline-none"
                      style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)", color: NAVY }} />
                  </>
                )}
                <button type="button" onClick={addCategory} disabled={!catInput.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide disabled:opacity-40"
                  style={{ background: NAVY, color: GOLD }}>
                  Agregar
                </button>
              </div>
            </div>

            {/* Grupos (GROUP_STAGE sin categorías) */}
            {isGroupStage && (
              <div className="space-y-2">
                {categories.length === 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls} style={{ color: "rgba(13,27,42,0.35)" }}>Nº de grupos</label>
                      <select value={form.groupCount} onChange={e => setForm(f => ({ ...f, groupCount: e.target.value }))}
                        className={inputCls} style={inputStyle}>
                        {[2,3,4,6,8].map(n => <option key={n} value={n}>{n} grupos</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls} style={{ color: "rgba(13,27,42,0.35)" }}>Cupo por grupo</label>
                      <input type="number" min="2" max="32" value={form.groupSize}
                        onChange={e => setForm(f => ({ ...f, groupSize: e.target.value }))}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                )}
                {categories.length === 0 && form.groupCount && form.groupSize && (
                  <p className="text-[11px] font-semibold" style={{ color: "rgba(13,27,42,0.4)" }}>
                    Cupo total: <strong style={{ color: NAVY }}>{Number(form.groupCount) * Number(form.groupSize)} participantes</strong>
                  </p>
                )}
                <div>
                  <label className={labelCls} style={{ color: "rgba(13,27,42,0.35)" }}>Clasifican por grupo</label>
                  <select value={form.advanceCount} onChange={e => setForm(f => ({ ...f, advanceCount: e.target.value }))}
                    className={inputCls} style={inputStyle}>
                    {[1,2,3,4].map(n => <option key={n} value={n}>{n === 1 ? "Solo el 1°" : `Top ${n}`}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Rango de fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Fecha de inicio *</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: f.endDate || e.target.value }))}
                  className={inputCls} style={inputStyle} required />
              </div>
              <div>
                <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Fecha de término</label>
                <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>

            {/* ── JORNADAS ── */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(13,27,42,0.02)", border: "1px solid rgba(13,27,42,0.1)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" style={{ color: NAVY }} />
                  <label className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: NAVY }}>Jornadas</label>
                  <span className="text-[10px]" style={{ color: "rgba(13,27,42,0.35)" }}>(opcional)</span>
                </div>
                <button type="button" onClick={addScheduleDay}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: "rgba(13,27,42,0.07)", color: NAVY }}>
                  <Plus className="w-3 h-3" /> Agregar día
                </button>
              </div>

              <div className="space-y-2">
                {scheduleDays.map((day, i) => {
                  const dayName = day.date ? DAY_NAMES[new Date(day.date + "T12:00:00").getDay()] : null
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-3 gap-1.5">
                        <div className="relative">
                          <input type="date" value={day.date} onChange={e => updateScheduleDay(i, "date", e.target.value)}
                            className="w-full rounded-lg px-2.5 py-1.5 text-xs outline-none"
                            style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)", color: NAVY }} />
                          {dayName && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none" style={{ color: GOLD }}>
                              {dayName}
                            </span>
                          )}
                        </div>
                        <input type="time" value={day.startTime} onChange={e => updateScheduleDay(i, "startTime", e.target.value)}
                          className="rounded-lg px-2.5 py-1.5 text-xs outline-none"
                          style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)", color: NAVY }} />
                        <input type="time" value={day.endTime} onChange={e => updateScheduleDay(i, "endTime", e.target.value)}
                          className="rounded-lg px-2.5 py-1.5 text-xs outline-none"
                          style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)", color: NAVY }} />
                      </div>
                      {scheduleDays.length > 1 && (
                        <button type="button" onClick={() => removeScheduleDay(i)} className="w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0" style={{ color: "#ef4444" }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {sortedDays.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {sortedDays.map(d => (
                    <span key={d.date} className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                      style={{ background: "rgba(13,27,42,0.06)", color: "rgba(13,27,42,0.5)" }}>
                      {DAY_NAMES[new Date(d.date + "T12:00:00").getDay()]} {d.startTime}–{d.endTime}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Canchas + cupo (cupo solo si no es GROUP_STAGE) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Canchas disponibles</label>
                <input type="number" min="1" value={form.courtCount} onChange={e => setForm(f => ({ ...f, courtCount: e.target.value }))} placeholder="Sin límite"
                  className={inputCls} style={inputStyle} />
              </div>
              {!isGroupStage && (
                <div>
                  <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Cupo máximo</label>
                  <input type="number" min="2" value={form.maxParticipants} onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value }))} placeholder="Sin límite"
                    className={inputCls} style={inputStyle} />
                </div>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Descripción</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Detalles, premios, reglas..."
                className={inputCls} style={{ ...inputStyle, resize: "none" }} />
            </div>

            <button type="submit" disabled={saving}
              className="w-full h-11 rounded-xl text-sm font-black uppercase tracking-wide transition-all disabled:opacity-50 mt-2"
              style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
              {saving ? "Creando…" : "Crear torneo"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
