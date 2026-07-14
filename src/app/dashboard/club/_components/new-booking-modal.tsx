"use client"
import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { ChevronDown, X, UserPlus } from "lucide-react"

const TIME_SLOTS: string[] = []
for (let h = 7; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`)
  if (h < 23) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`)
}

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"
const BORDER = "rgba(201,168,76,0.2)"

type BookingType = "simple" | "recurring" | "class"

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: "rgba(13,27,42,0.4)" }}>{label}</p>
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(o => !o)}
          className="w-full h-10 rounded-xl px-4 pr-9 text-sm text-left flex items-center font-medium"
          style={{ border: BORDER, background: "#f5f4f0", color: NAVY }}>
          {value}
        </button>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: GOLD }} />
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border shadow-2xl overflow-y-auto max-h-48"
            style={{ border: BORDER, background: "#ffffff" }}>
            {TIME_SLOTS.map(t => (
              <button key={t} type="button" onClick={() => { onChange(t); setOpen(false) }}
                className="w-full px-4 py-2 text-sm text-left transition-colors"
                style={t === value ? { background: "rgba(201,168,76,0.12)", color: GOLD, fontWeight: 700 } : { color: NAVY }}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type NewClientForm = { name: string; email: string; phone: string }
type Client = { id: string; name: string; email: string | null; phone: string | null }
type CoachFeeRule = { days: number[]; startTime: string; endTime: string; classPrice: number }
type Coach = { id: string; name: string; color: string; paymentType: string; feeRules: CoachFeeRule[] }

function ClientCombobox({ clients, value, onSelect }: {
  clients: Client[]
  value: { id: string; name: string; email?: string; phone?: string } | null
  onSelect: (v: { id: string; name: string; email?: string; phone?: string } | null) => void
}) {
  const [query, setQuery] = useState(value?.name || "")
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState<NewClientForm | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const filtered = query.trim().length > 0
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients
  const exactMatch = clients.find(c => c.name.toLowerCase() === query.toLowerCase())

  function startCreating() { setOpen(false); setCreating({ name: query.trim(), email: "", phone: "" }) }
  function confirmCreate() {
    if (!creating?.name.trim()) return
    onSelect({ id: "", name: creating.name.trim(), email: creating.email.trim() || undefined, phone: creating.phone.trim() || undefined })
    setQuery(creating.name.trim()); setCreating(null)
  }

  return (
    <div ref={ref}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: "rgba(13,27,42,0.4)" }}>Cliente</p>
      {creating ? (
        <div className="rounded-xl p-3 space-y-2" style={{ border: `1px solid rgba(201,168,76,0.35)`, background: "rgba(201,168,76,0.04)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: GOLD }}>
            <UserPlus className="w-3 h-3" /> Nuevo cliente
          </p>
          {(["name", "email", "phone"] as const).map(field => (
            <input key={field} value={creating[field]}
              onChange={e => setCreating(f => f ? { ...f, [field]: e.target.value } : f)}
              placeholder={field === "name" ? "Nombre *" : field === "email" ? "Email (opcional)" : "Teléfono (opcional)"}
              className="w-full h-9 rounded-lg px-3 text-sm"
              style={{ border: "1px solid rgba(13,27,42,0.15)", background: "#f5f4f0", color: NAVY, outline: "none" }} />
          ))}
          <div className="flex gap-2 pt-0.5">
            <button type="button" onClick={() => { setCreating(null); onSelect(null) }}
              className="flex-1 h-8 rounded-lg text-xs font-medium"
              style={{ border: "1px solid rgba(13,27,42,0.12)", color: "rgba(13,27,42,0.45)", background: "#f5f4f0" }}>
              Cancelar
            </button>
            <button type="button" onClick={confirmCreate} disabled={!creating.name.trim()}
              className="flex-1 h-8 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(null) }}
            onFocus={() => setOpen(true)} placeholder="Buscar o dejar sin cliente…"
            className="w-full h-10 rounded-xl px-4 text-sm"
            style={{ border: BORDER, background: "#f5f4f0", color: NAVY, outline: "none" }} />
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border shadow-2xl overflow-hidden"
              style={{ border: BORDER, background: "#ffffff" }}>
              <button type="button" onClick={() => { onSelect(null); setQuery(""); setOpen(false) }}
                className="w-full px-4 py-2.5 text-sm text-left border-b"
                style={{ color: "rgba(13,27,42,0.4)", borderColor: "rgba(13,27,42,0.06)" }}>
                Sin cliente (reserva anónima)
              </button>
              {filtered.length > 0 && (
                <div className="max-h-36 overflow-y-auto">
                  {filtered.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { onSelect({ id: c.id, name: c.name }); setQuery(c.name); setOpen(false) }}
                      className="w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center gap-2"
                      style={{ color: NAVY }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: NAVY }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {query.trim() && !exactMatch && (
                <button type="button" onClick={startCreating}
                  className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 font-semibold"
                  style={{ borderTop: "1px solid rgba(201,168,76,0.12)", color: GOLD, background: "rgba(201,168,76,0.05)" }}>
                  <UserPlus className="w-4 h-4" /> Crear cliente "{query.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {!creating && value && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {value.id
            ? <span className="text-[10px]" style={{ color: "rgba(13,27,42,0.4)" }}>Cliente existente</span>
            : <span className="text-[10px] flex items-center gap-1" style={{ color: GOLD }}><UserPlus className="w-3 h-3" /> Se creará al guardar</span>}
          <button type="button" onClick={() => { onSelect(null); setQuery("") }}
            className="text-[10px] ml-auto" style={{ color: "rgba(13,27,42,0.3)" }}>✕ quitar</button>
        </div>
      )}
    </div>
  )
}

type PricingRule = { id: string; name: string; days: number[]; startTime: string; endTime: string; price: number; fixedSlots?: string[]; paymentPlayers?: number }
type Court = { id: string; name: string; sport: string | null; color: string; isActive?: boolean; pricingRules?: PricingRule[] }

function calcPrice(court: Court | undefined, startTime: string, endTime: string, date: string): number {
  if (!court?.pricingRules?.length || !startTime || !endTime || !date) return 0
  const start = new Date(`${date}T${startTime}`)
  const end = new Date(`${date}T${endTime}`)
  if (end <= start) return 0
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  const dayOfWeek = start.getDay()
  let pricePerHour = 0
  for (const rule of court.pricingRules) {
    if (rule.days.includes(dayOfWeek) && startTime >= rule.startTime && startTime < rule.endTime) {
      pricePerHour = Number(rule.price); break
    }
  }
  return pricePerHour * durationHours
}

function calcClassPrice(coach: Coach | undefined, startTime: string, endTime: string, date: string): number {
  if (!coach?.feeRules?.length || !startTime || !endTime || !date) return 0
  const start = new Date(`${date}T${startTime}`)
  const end = new Date(`${date}T${endTime}`)
  if (end <= start) return 0
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  const dayOfWeek = start.getDay()
  for (const rule of coach.feeRules) {
    const days = rule.days.map(Number)
    if (days.includes(dayOfWeek) && startTime >= rule.startTime && startTime < rule.endTime) {
      return Number(rule.classPrice) * durationHours
    }
  }
  return 0
}

function countOccurrences(startDate: string, endDate: string, dayOfWeek: number): number {
  if (!startDate || !endDate || endDate <= startDate) return 0
  const start = new Date(startDate + "T00:00:00Z")
  const end = new Date(endDate + "T00:00:00Z")
  const cursor = new Date(start)
  while (cursor.getUTCDay() !== dayOfWeek) cursor.setUTCDate(cursor.getUTCDate() + 1)
  let count = 0
  while (cursor <= end) { count++; cursor.setUTCDate(cursor.getUTCDate() + 7) }
  return count
}

const BOOKING_TYPES: { key: BookingType; label: string; desc: string }[] = [
  { key: "simple",    label: "Reserva común",    desc: "Cancha libre sin instructor" },
  { key: "recurring", label: "Reserva múltiple", desc: "Repite semanalmente" },
  { key: "class",     label: "Clase particular", desc: "Con entrenador asignado" },
]

export default function NewBookingModal({
  businessId, courts, clients, preselect, onClose, onSaved,
}: {
  businessId: string
  courts: Court[]
  clients: Client[]
  preselect?: { courtId: string; date: string; startTime: string; endTime: string } | null
  onClose: () => void
  onSaved: () => void
}) {
  const [bookingType, setBookingType] = useState<BookingType>("simple")

  function handleSetBookingType(type: BookingType) {
    setBookingType(type)
    if (type === "class") {
      setForm(f => {
        const [sh, sm] = f.startTime.split(":").map(Number)
        const endMins = sh * 60 + sm + 60
        const endH = Math.min(Math.floor(endMins / 60), 23)
        const endM = endMins % 60
        return { ...f, endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}` }
      })
    }
  }

  const [form, setForm] = useState({
    courtId: preselect?.courtId || courts[0]?.id || "",
    date: preselect?.date || new Date().toISOString().slice(0, 10),
    startTime: preselect?.startTime || "09:00",
    endTime: preselect?.endTime || "10:00",
    notes: "",
  })
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; email?: string; phone?: string } | null>(null)
  const [selectedCoachId, setSelectedCoachId] = useState<string>("")
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [saving, setSaving] = useState(false)
  const [allCourts, setAllCourts] = useState<Court[]>(courts)
  const [rangeEnd, setRangeEnd] = useState("")

  useEffect(() => {
    fetch(`/api/businesses/${businessId}/courts`).then(r => r.json()).then(d => setAllCourts(d.courts || []))
    fetch(`/api/businesses/${businessId}/club-coaches`).then(r => r.json()).then(d => setCoaches((d.coaches || []).filter((c: Coach & { isActive: boolean }) => c.isActive)))
  }, [businessId])

  const selectedCourt = allCourts.find(c => c.id === form.courtId)
  const selectedCoach = coaches.find(c => c.id === selectedCoachId)
  const price = bookingType === "class"
    ? calcClassPrice(selectedCoach, form.startTime, form.endTime, form.date)
    : calcPrice(selectedCourt, form.startTime, form.endTime, form.date)
  const selectedDayOfWeek = form.date ? new Date(form.date + "T00:00:00Z").getUTCDay() : -1
  const sessionCount = bookingType === "recurring" ? countOccurrences(form.date, rangeEnd, selectedDayOfWeek) : 0

  // Fixed slots: only activate if the selected start time falls within the rule's time range
  const activeRuleWithSlots = selectedCourt?.pricingRules?.find(rule =>
    (rule.fixedSlots?.length ?? 0) > 0 &&
    rule.days.includes(selectedDayOfWeek) &&
    (!form.startTime || (form.startTime >= rule.startTime && form.startTime < rule.endTime))
  )
  const fixedSlots: string[] = activeRuleWithSlots?.fixedSlots ?? []

  function getSlotEnd(startStr: string): string {
    const idx = fixedSlots.indexOf(startStr)
    if (idx >= 0 && idx < fixedSlots.length - 1) return fixedSlots[idx + 1]
    const [h, m] = startStr.split(":").map(Number)
    const endMins = h * 60 + m + 90
    return `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`
  }

  async function resolveClientId(): Promise<string | null> {
    if (!selectedClient) return null
    if (selectedClient.id) return selectedClient.id
    const cr = await fetch(`/api/businesses/${businessId}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: selectedClient.name, email: selectedClient.email || null, phone: selectedClient.phone || null }),
    })
    if (cr.ok) { const cd = await cr.json(); return cd.client?.id || null }
    return null
  }

  async function handleSave() {
    if (!form.courtId || !form.date || !form.startTime || !form.endTime) {
      toast.error("Completa todos los campos requeridos"); return
    }
    if (bookingType === "recurring" && !rangeEnd) {
      toast.error("Selecciona una fecha de término para la recurrencia"); return
    }
    if (bookingType === "class" && !selectedCoachId) {
      toast.error("Selecciona un entrenador"); return
    }
    setSaving(true)
    try {
      const clientId = await resolveClientId()

      if (bookingType === "recurring") {
        const [startHour, startMinute] = form.startTime.split(":").map(Number)
        const [endHour, endMinute] = form.endTime.split(":").map(Number)
        const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
        if (durationMinutes <= 0) { toast.error("El horario de fin debe ser posterior al de inicio"); setSaving(false); return }

        const r = await fetch(`/api/businesses/${businessId}/recurring-bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId: form.courtId, clientId,
            dayOfWeek: selectedDayOfWeek, startHour, startMinute, durationMinutes,
            rangeStart: form.date, rangeEnd, notes: form.notes || null,
          }),
        })
        const d = await r.json()
        if (r.ok) {
          const msg = [`${d.created} sesión${d.created !== 1 ? "es" : ""} creada${d.created !== 1 ? "s" : ""}`]
          if (d.skipped?.length) msg.push(`${d.skipped.length} omitida${d.skipped.length !== 1 ? "s" : ""} por feriado`)
          if (d.conflicts?.length) msg.push(`${d.conflicts.length} con conflicto`)
          toast.success(msg.join(" · "))
          onSaved()
        } else {
          toast.error(d.error || "Error al crear reservas recurrentes")
        }
      } else {
        // simple o class
        const r = await fetch(`/api/businesses/${businessId}/court-bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId: form.courtId, clientId,
            startTime: `${form.date}T${form.startTime}:00`,
            endTime: `${form.date}T${form.endTime}:00`,
            notes: form.notes || null,
            coachId: bookingType === "class" ? (selectedCoachId || null) : null,
          }),
        })
        if (r.ok) { toast.success(bookingType === "class" ? "Clase particular creada" : "Reserva creada"); onSaved() }
        else { const d = await r.json(); toast.error(d.error || "Error al crear") }
      }
    } finally {
      setSaving(false)
    }
  }

  const labelCls = "text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5"
  const inputCls = "w-full h-10 rounded-xl px-4 text-sm font-medium"
  const inputStyle = { border: BORDER, background: "#f5f4f0", color: NAVY, outline: "none" }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden" style={{ border: BORDER, background: "#ffffff" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: `1px solid rgba(201,168,76,0.12)` }}>
          <div>
            <h2 className="text-[15px] font-black uppercase tracking-wide" style={{ color: NAVY }}>Nueva reserva</h2>
            <p className="text-xs mt-0.5" style={{ color: GOLD }}>Asigna una cancha y horario</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ color: "rgba(13,27,42,0.3)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* Selector tipo de reserva */}
          <div>
            <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Tipo de reserva</p>
            <div className="grid grid-cols-3 gap-1.5">
              {BOOKING_TYPES.map(bt => (
                <button key={bt.key} type="button" onClick={() => handleSetBookingType(bt.key)}
                  className="rounded-xl px-2 py-2.5 text-center transition-all"
                  style={bookingType === bt.key
                    ? { background: "rgba(201,168,76,0.1)", border: `1.5px solid ${GOLD}` }
                    : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)" }}>
                  <p className="text-[11px] font-black leading-tight" style={{ color: bookingType === bt.key ? "#8a6520" : NAVY }}>{bt.label}</p>
                  <p className="text-[9px] mt-0.5 leading-tight" style={{ color: "rgba(13,27,42,0.4)" }}>{bt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cancha */}
          <div>
            <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Cancha</p>
            <div className="relative">
              <select value={form.courtId} onChange={e => setForm(f => ({ ...f, courtId: e.target.value }))}
                className={inputCls + " appearance-none pr-9"} style={inputStyle}>
                <option value="" disabled>Seleccionar cancha</option>
                {allCourts.filter(c => c.isActive !== false).map(c =>
                  <option key={c.id} value={c.id}>{c.name}{c.sport ? ` (${c.sport})` : ""}</option>
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: GOLD }} />
            </div>
          </div>

          {/* Entrenador — solo clase particular */}
          {bookingType === "class" && (
            <div>
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Entrenador *</p>
              {coaches.length === 0 ? (
                <p className="text-xs py-2" style={{ color: "rgba(13,27,42,0.4)" }}>No hay entrenadores activos. Agrégalos en la pestaña Entrenadores.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {coaches.map(coach => (
                    <button key={coach.id} type="button" onClick={() => setSelectedCoachId(coach.id)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                      style={selectedCoachId === coach.id
                        ? { background: "rgba(201,168,76,0.1)", border: `1.5px solid ${GOLD}` }
                        : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: coach.color }}>
                        {coach.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: selectedCoachId === coach.id ? "#8a6520" : NAVY }}>{coach.name}</p>
                        <p className="text-[10px]" style={{ color: "rgba(13,27,42,0.4)" }}>
                          {coach.paymentType === "COMMISSION" ? "Comisión" : "Arriendo cancha"}
                        </p>
                      </div>
                      {selectedCoachId === coach.id && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.2)", color: GOLD }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cliente */}
          <ClientCombobox clients={clients} value={selectedClient} onSelect={setSelectedClient} />

          {/* Fecha */}
          <div>
            <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>{bookingType === "recurring" ? "Fecha de inicio" : "Fecha"}</p>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
          </div>

          {/* Horario */}
          {fixedSlots.length > 0 ? (
            <div>
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Horario — elige un bloque</p>
              <div className="grid grid-cols-3 gap-1.5">
                {fixedSlots.map(slot => {
                  const end = getSlotEnd(slot)
                  const isSelected = form.startTime === slot
                  return (
                    <button key={slot} type="button"
                      onClick={() => setForm(f => ({ ...f, startTime: slot, endTime: end }))}
                      className="rounded-xl py-2.5 text-center transition-all"
                      style={isSelected
                        ? { background: "rgba(201,168,76,0.15)", border: `1.5px solid ${GOLD}`, color: "#8a6520" }
                        : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)", color: NAVY }}>
                      <p className="text-xs font-black">{slot}</p>
                      <p className="text-[9px]" style={{ color: isSelected ? "rgba(138,101,32,0.6)" : "rgba(13,27,42,0.35)" }}>– {end}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <TimeSelect label="Inicio" value={form.startTime} onChange={v => setForm(f => ({ ...f, startTime: v }))} />
              <TimeSelect label="Fin" value={form.endTime} onChange={v => setForm(f => ({ ...f, endTime: v }))} />
            </div>
          )}

          {/* Panel recurrencia */}
          {bookingType === "recurring" && (
            <div className="rounded-xl p-3.5 space-y-3" style={{ border: `1px solid rgba(201,168,76,0.25)`, background: "rgba(201,168,76,0.04)" }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>Repite cada</span>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ background: "rgba(201,168,76,0.15)", color: "#8a6520" }}>
                  {selectedDayOfWeek >= 0 ? DAYS_ES[selectedDayOfWeek] : "—"}
                </span>
                <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>a las {form.startTime}</span>
              </div>
              <div>
                <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Fecha de término</p>
                <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}
                  min={form.date}
                  className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
              </div>
              {sessionCount > 0 && (
                <div className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                  style={{ background: "rgba(201,168,76,0.1)", color: "#8a6520" }}>
                  <span>Se crearán</span>
                  <span className="font-black">{sessionCount} sesiones</span>
                </div>
              )}
              <p className="text-[10px] leading-relaxed" style={{ color: "rgba(13,27,42,0.4)" }}>
                Los feriados de tipo "Cerrado" se omiten automáticamente. Los de recargo ajustan el precio de esa sesión.
              </p>
            </div>
          )}

          {/* Precio estimado */}
          {bookingType !== "recurring" && price > 0 && (
            <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
              style={{ background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)` }}>
              <p className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>Precio estimado</p>
              <p className="text-sm font-black" style={{ color: GOLD }}>${price.toLocaleString("es-CL")}</p>
            </div>
          )}

          {/* Notas */}
          <div>
            <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Notas</p>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observaciones (opcional)"
              className={inputCls} style={{ ...inputStyle, color: NAVY }} />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full h-11 rounded-xl text-sm font-black uppercase tracking-wide transition-all disabled:opacity-50"
            style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
            {saving ? "Guardando…" : bookingType === "recurring" ? "Crear reservas recurrentes" : bookingType === "class" ? "Crear clase particular" : "Confirmar reserva"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
