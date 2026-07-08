"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { useBusiness } from "@/contexts/business-context"
import { Plus, Pencil, Trash2, Trophy, X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"

type PricingRule = { id?: string; name: string; days: number[]; startTime: string; endTime: string; price: number }
type Court = { id: string; name: string; sport: string | null; description: string | null; color: string; isActive: boolean; sponsorName: string | null; sponsorLogo: string | null; sponsorUrl: string | null; pricingRules: PricingRule[] }

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const EMPTY_RULE: PricingRule = { name: "", days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "18:00", price: 0 }

export default function CourtsPage() {
  const { businessId } = useBusiness()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Court | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", sport: "", description: "", color: "#38bdf8", sponsorName: "", sponsorLogo: "", sponsorUrl: "", pricingRules: [{ ...EMPTY_RULE }] as PricingRule[] })
  const [uploadingSponsor, setUploadingSponsor] = useState(false)
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [futureBookings, setFutureBookings] = useState(0)
  const [updateFutureBookings, setUpdateFutureBookings] = useState(false)

  const load = useCallback(async (bid: string) => {
    const r = await fetch(`/api/businesses/${bid}/courts`)
    const d = await r.json()
    setCourts(d.courts || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!businessId) return
    load(businessId)
  }, [businessId, load])

  async function handleSponsorLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSponsor(true)
    const fd = new FormData(); fd.append("file", file)
    const r = await fetch("/api/upload", { method: "POST", body: fd })
    const d = await r.json()
    if (r.ok) setForm(f => ({ ...f, sponsorLogo: d.url }))
    setUploadingSponsor(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ name: "", sport: "", description: "", color: "#38bdf8", sponsorName: "", sponsorLogo: "", sponsorUrl: "", pricingRules: [{ ...EMPTY_RULE }] })
    setOpen(true)
  }

  async function openEdit(c: Court) {
    setEditing(c)
    setForm({ name: c.name, sport: c.sport || "", description: c.description || "", color: c.color, sponsorName: c.sponsorName || "", sponsorLogo: c.sponsorLogo || "", sponsorUrl: c.sponsorUrl || "", pricingRules: c.pricingRules.length > 0 ? c.pricingRules.map(r => ({ ...r })) : [{ ...EMPTY_RULE }] })
    setFutureBookings(0)
    setUpdateFutureBookings(false)
    setOpen(true)
    const today = new Date(); today.setHours(0, 0, 0, 0); const from = today.toISOString()
    const r = await fetch(`/api/businesses/${businessId}/court-bookings?from=${from}&to=2099-01-01T00:00:00.000Z`)
    if (r.ok) {
      const d = await r.json()
      const count = (d.bookings as { courtId?: string; court?: { id: string } }[] || []).filter(b => (b.courtId ?? b.court?.id) === c.id).length
      setFutureBookings(count)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return }
    setSaving(true)
    const url = editing ? `/api/businesses/${businessId}/courts/${editing.id}` : `/api/businesses/${businessId}/courts`
    const method = editing ? "PATCH" : "POST"
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) {
      if (editing && updateFutureBookings && futureBookings > 0) {
        const today = new Date(); today.setHours(0, 0, 0, 0); const from = today.toISOString()
        const br = await fetch(`/api/businesses/${businessId}/court-bookings?from=${from}&to=2099-01-01T00:00:00.000Z`)
        if (br.ok) {
          const bd = await br.json()
          const future = (bd.bookings as { id: string; courtId?: string; court?: { id: string }; startTime: string }[] || []).filter(b => (b.courtId ?? b.court?.id) === editing.id)
          await Promise.all(future.map(b => {
            const start = new Date(b.startTime)
            const dayOfWeek = start.getDay()
            const timeStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
            const matchingRule = form.pricingRules.find(rule =>
              rule.days.includes(dayOfWeek) &&
              timeStr >= rule.startTime &&
              timeStr < rule.endTime
            )
            if (!matchingRule) return Promise.resolve()
            return fetch(`/api/businesses/${businessId}/court-bookings/${b.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ price: matchingRule.price }),
            })
          }))
          toast.success(`Cancha actualizada · ${future.length} reserva${future.length !== 1 ? "s" : ""} actualizada${future.length !== 1 ? "s" : ""}`)
        }
      } else {
        toast.success(editing ? "Cancha actualizada" : "Cancha creada")
      }
      setOpen(false); load(businessId)
    } else {
      const d = await r.json().catch(() => ({})); toast.error(d.error || `Error ${r.status} al guardar`)
    }
    setSaving(false)
  }

  async function handleDelete(c: Court) {
    if (!confirm(`¿Desactivar "${c.name}"?`)) return
    await fetch(`/api/businesses/${businessId}/courts/${c.id}`, { method: "DELETE" })
    toast.success("Cancha desactivada")
    load(businessId)
  }

  function handleDragStart(e: React.DragEvent, idx: number) {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", String(idx))
    dragIndex.current = idx
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOver(idx)
  }

  async function handleDrop(targetIdx: number) {
    const from = dragIndex.current
    if (from === null || from === targetIdx) { setDragOver(null); dragIndex.current = null; return }
    const next = [...courts]
    const [moved] = next.splice(from, 1)
    next.splice(targetIdx, 0, moved)
    setCourts(next)
    setDragOver(null)
    dragIndex.current = null
    await fetch(`/api/businesses/${businessId}/courts/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map(c => c.id) }),
    })
  }

  function updateRule(idx: number, field: keyof PricingRule, value: string | number | number[]) {
    setForm(f => { const rules = [...f.pricingRules]; rules[idx] = { ...rules[idx], [field]: value }; return { ...f, pricingRules: rules } })
  }

  function toggleDay(idx: number, day: number) {
    const rule = form.pricingRules[idx]
    const days = rule.days.includes(day) ? rule.days.filter(d => d !== day) : [...rule.days, day]
    updateRule(idx, "days", days)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Canchas y recursos</h1>
          <p className="page-subtitle">Gestiona tus instalaciones y tarifas por horario</p>
        </div>
        <Button onClick={openNew} className="bg-sky-500 hover:bg-sky-400 gap-2">
          <Plus className="w-4 h-4" /> Nueva cancha
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30 text-sm">Cargando…</div>
      ) : courts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/40 text-sm">No hay canchas aún</p>
          <p className="text-white/20 text-xs mt-1">Crea tu primera cancha para empezar a recibir reservas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map((c, idx) => (
            <div key={c.id}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { setDragOver(null); dragIndex.current = null }}
              className={`rounded-2xl overflow-hidden transition-all select-none flex flex-col ${!c.isActive ? "opacity-50" : ""}`}
              style={{
                cursor: "grab",
                background: "#0d1b2a",
                border: dragOver === idx ? `2px solid #C9A84C` : "1px solid rgba(201,168,76,0.2)",
                boxShadow: dragOver === idx ? "0 4px 20px rgba(201,168,76,0.25)" : "0 2px 8px rgba(0,0,0,0.2)",
                transform: dragOver === idx ? "scale(1.02)" : "scale(1)",
                minHeight: "160px",
              }}
            >
              <div className="h-1.5" style={{ background: c.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-white">{c.name}{c.sponsorName ? ` ${c.sponsorName}` : ""}</p>
                        {c.sponsorLogo && <img src={c.sponsorLogo} alt={c.sponsorName || ""} className="h-5 w-auto object-contain opacity-90" />}
                      </div>
                      {c.sport && <p className="text-xs mt-0.5 font-semibold uppercase tracking-wide" style={{ color: "#C9A84C" }}>{c.sport}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={e => { e.stopPropagation(); openEdit(c) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)" }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(c) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {c.pricingRules.length > 0 ? (
                  <div className="space-y-1.5">
                    {c.pricingRules.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>{r.name} · {r.startTime}–{r.endTime}</span>
                        <span className="font-bold" style={{ color: "#C9A84C" }}>${Number(r.price).toLocaleString("es-CL")}/hr</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Sin tarifas configuradas</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-white/[0.08] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 bg-[#1c1c1e] z-10 border-b border-white/[0.06]">
            <div>
              <h2 className="text-[15px] font-semibold text-white">{editing ? "Editar cancha" : "Nueva cancha"}</h2>
              <p className="text-xs text-white/35 mt-0.5">Configura las tarifas por franja horaria</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-4 pt-4">
            {/* Advertencia reservas futuras */}
            {editing && futureBookings > 0 && (
              <div className="rounded-lg px-3.5 py-3 space-y-2.5" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <p className="text-[12px] leading-snug" style={{ color: "#fbbf24" }}>
                  <span className="font-bold">⚠ {futureBookings} reserva{futureBookings !== 1 ? "s" : ""} futura{futureBookings !== 1 ? "s" : ""}</span> no actualizarán su precio automáticamente al guardar los cambios.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={updateFutureBookings} onChange={e => setUpdateFutureBookings(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-amber-400" />
                  <span className="text-[12px] font-medium" style={{ color: "#fbbf24" }}>Actualizar precio en reservas futuras de esta cancha</span>
                </label>
              </div>
            )}
            {/* Nombre + Deporte */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre de la cancha *"
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
              </div>
              <>
                <input list="sports-list" value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}
                  placeholder="Deporte (ej: Pádel)"
                  className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
                <datalist id="sports-list">
                  {["Pádel","Tenis","Fútbol","Básquetbol","Volleyball","Squash","Badminton","Tenis de mesa","Natación","Rugby","Hockey","Atletismo","Ciclismo","Boxeo","Artes marciales","CrossFit","Pilates","Yoga"].map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </>
              <div className="flex items-center gap-3 h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                <span className="text-sm text-white/50">Color</span>
              </div>
            </div>

            {/* Auspiciador */}
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">Auspiciador (naming)</p>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-3">
                <input value={form.sponsorName} onChange={e => setForm(f => ({ ...f, sponsorName: e.target.value }))}
                  placeholder="Nombre de la marca (ej: Nissan)"
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
                <div className="flex items-center gap-3">
                  {form.sponsorLogo ? (
                    <div className="relative flex-shrink-0">
                      <img src={form.sponsorLogo} alt="Logo" className="w-14 h-14 object-contain rounded-lg bg-white/10 p-1" />
                      <button onClick={() => setForm(f => ({ ...f, sponsorLogo: "" }))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ) : null}
                  <label className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-white/[0.15] text-xs text-white/40 hover:border-sky-500/50 hover:text-sky-400 transition-colors cursor-pointer">
                    {uploadingSponsor ? "Subiendo…" : "Subir logo del auspiciador"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleSponsorLogo} disabled={uploadingSponsor} />
                  </label>
                </div>
                <input value={form.sponsorUrl} onChange={e => setForm(f => ({ ...f, sponsorUrl: e.target.value }))}
                  placeholder="Web del auspiciador (ej: https://nissan.cl)"
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
                <p className="text-[10px] text-white/25">El logo aparecerá en el email — al presionarlo lleva a la web del auspiciador</p>
              </div>
            </div>

            {/* Tarifas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Tarifas</p>
                <div className="flex items-center gap-3">
                  {courts.filter(c => c.id !== editing?.id && c.pricingRules.length > 0).length > 0 && (
                    <select
                      defaultValue=""
                      onChange={e => {
                        const source = courts.find(c => c.id === e.target.value)
                        if (source) setForm(f => ({ ...f, pricingRules: source.pricingRules.map(r => ({ ...r, id: undefined })) }))
                      }}
                      className="h-6 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 text-[11px] text-white/50 focus:outline-none focus:border-sky-500/60 appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Copiar tarifas de…</option>
                      {courts.filter(c => c.id !== editing?.id && c.pricingRules.length > 0).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => setForm(f => ({ ...f, pricingRules: [...f.pricingRules, { ...EMPTY_RULE }] }))}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Agregar tarifa
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {form.pricingRules.map((rule, idx) => (
                  <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input value={rule.name} onChange={e => updateRule(idx, "name", e.target.value)}
                        placeholder="Nombre (ej: Valle, Punta)"
                        className="flex-1 h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
                      {form.pricingRules.length > 1 && (
                        <button onClick={() => setForm(f => ({ ...f, pricingRules: f.pricingRules.filter((_, i) => i !== idx) }))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Días */}
                    <div className="flex gap-1">
                      {DAYS.map((d, di) => (
                        <button key={di} onClick={() => toggleDay(idx, di)}
                          className={`flex-1 h-7 rounded-md text-[10px] font-semibold transition-colors ${rule.days.includes(di) ? "bg-sky-500 text-white" : "bg-white/[0.05] text-white/30 hover:bg-white/[0.1]"}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    {/* Horario + precio */}
                    <div className="grid grid-cols-3 gap-2">
                      <input type="time" value={rule.startTime} onChange={e => updateRule(idx, "startTime", e.target.value)}
                        className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 text-xs text-white focus:outline-none focus:border-sky-500/60 [color-scheme:dark]" />
                      <input type="time" value={rule.endTime} onChange={e => updateRule(idx, "endTime", e.target.value)}
                        className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 text-xs text-white focus:outline-none focus:border-sky-500/60 [color-scheme:dark]" />
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/30">$</span>
                        <input type="text" inputMode="numeric" value={rule.price === 0 ? "" : rule.price}
                          onFocus={e => e.target.select()}
                          onChange={e => updateRule(idx, "price", parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                          placeholder="0"
                          className="w-full h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] pl-6 pr-2 text-xs text-white focus:outline-none focus:border-sky-500/60" />
                      </div>
                    </div>
                    <p className="text-[10px] text-white/25">Precio por hora en este rango</p>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-sky-500 hover:bg-sky-400 h-11 font-semibold">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear cancha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
