"use client"
import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { ChevronDown, X, UserPlus, RefreshCw } from "lucide-react"

const TIME_SLOTS: string[] = []
for (let h = 7; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`)
  if (h < 23) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`)
}

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"
const BORDER = "rgba(201,168,76,0.2)"

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

type PricingRule = { id: string; name: string; days: number[]; startTime: string; endTime: string; price: number }
type Court = { id: string; name: string; sport: string | null; color: string; isActive?: boolean; pricingRules?: PricingRule[] }
type Client = { id: string; name: string; email: string | null; phone: string | null }

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

// Cuenta las ocurrencias del día de semana entre dos fechas
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
  const [form, setForm] = useState({
    courtId: preselect?.courtId || courts[0]?.id || "",
    date: preselect?.date || new Date().toISOString().slice(0, 10),
    startTime: preselect?.startTime || "09:00",
    endTime: preselect?.endTime || "10:00",
    notes: "",
  })
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; email?: string; phone?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [allCourts, setAllCourts] = useState<Court[]>(courts)

  // Recurrencia
  const [isRecurring, setIsRecurring] = useState(false)
  const [rangeEnd, setRangeEnd] = useState("")

  useEffect(() => {
    fetch(`/api/businesses/${businessId}/courts`).then(r => r.json()).then(d => setAllCourts(d.courts || []))
  }, [businessId])

  const selectedCourt = allCourts.find(c => c.id === form.courtId)
  const price = calcPrice(selectedCourt, form.startTime, form.endTime, form.date)

  // Para recurrencia: día de semana derivado de la fecha seleccionada
  const selectedDayOfWeek = form.date ? new Date(form.date + "T00:00:00Z").getUTCDay() : -1
  const sessionCount = isRecurring ? countOccurrences(form.date, rangeEnd, selectedDayOfWeek) : 0

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
    if (isRecurring && !rangeEnd) {
      toast.error("Selecciona una fecha de término para la recurrencia"); return
    }
    setSaving(true)
    try {
      const clientId = await resolveClientId()

      if (isRecurring) {
        const [startHour, startMinute] = form.startTime.split(":").map(Number)
        const [endHour, endMinute] = form.endTime.split(":").map(Number)
        const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
        if (durationMinutes <= 0) { toast.error("El horario de fin debe ser posterior al de inicio"); setSaving(false); return }

        const r = await fetch(`/api/businesses/${businessId}/recurring-bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId: form.courtId,
            clientId,
            dayOfWeek: selectedDayOfWeek,
            startHour,
            startMinute,
            durationMinutes,
            rangeStart: form.date,
            rangeEnd,
            notes: form.notes || null,
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
        const r = await fetch(`/api/businesses/${businessId}/court-bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId: form.courtId,
            clientId,
            startTime: `${form.date}T${form.startTime}:00`,
            endTime: `${form.date}T${form.endTime}:00`,
            notes: form.notes || null,
          }),
        })
        if (r.ok) { toast.success("Reserva creada"); onSaved() }
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
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "rgba(13,27,42,0.3)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4 space-y-3 max-h-[80vh] overflow-y-auto">
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

          {/* Cliente combobox */}
          <ClientCombobox clients={clients} value={selectedClient} onSelect={setSelectedClient} />

          {/* Fecha de inicio */}
          <div>
            <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>{isRecurring ? "Fecha de inicio" : "Fecha"}</p>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
          </div>

          {/* Horario */}
          <div className="grid grid-cols-2 gap-2">
            <TimeSelect label="Inicio" value={form.startTime} onChange={v => setForm(f => ({ ...f, startTime: v }))} />
            <TimeSelect label="Fin" value={form.endTime} onChange={v => setForm(f => ({ ...f, endTime: v }))} />
          </div>

          {/* Recurrencia — siempre visible */}
          <div className="rounded-xl overflow-hidden" style={{ border: isRecurring ? `1px solid ${GOLD}` : "1px solid rgba(13,27,42,0.1)" }}>
            {/* Toggle header */}
            <button type="button" onClick={() => setIsRecurring(r => !r)}
              className="w-full h-10 px-4 text-sm font-semibold flex items-center gap-2.5 transition-all"
              style={isRecurring
                ? { background: "rgba(201,168,76,0.12)", color: "#8a6520" }
                : { background: "#f5f4f0", color: "rgba(13,27,42,0.5)" }}>
              <RefreshCw className="w-4 h-4 flex-shrink-0" style={{ color: isRecurring ? GOLD : "rgba(13,27,42,0.35)" }} />
              <span className="flex-1 text-left">{isRecurring ? "Reserva recurrente" : "Reserva única"}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={isRecurring
                  ? { background: "rgba(201,168,76,0.2)", color: GOLD }
                  : { background: "rgba(13,27,42,0.06)", color: "rgba(13,27,42,0.35)" }}>
                {isRecurring ? "recurrente" : "única"}
              </span>
            </button>

            {/* Panel recurrencia expandido */}
            {isRecurring && (
            <div className="rounded-xl p-3.5 space-y-3" style={{ border: `1px solid rgba(201,168,76,0.25)`, background: "rgba(201,168,76,0.04)" }}>
              {/* Día de semana (informativo) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>Repite cada</span>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ background: "rgba(201,168,76,0.15)", color: "#8a6520" }}>
                  {selectedDayOfWeek >= 0 ? DAYS_ES[selectedDayOfWeek] : "—"}
                </span>
                <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>a las {form.startTime}</span>
              </div>

              {/* Fecha de término */}
              <div>
                <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Fecha de término</p>
                <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}
                  min={form.date}
                  className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
              </div>

              {/* Preview sesiones */}
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
          </div>

          {/* Precio estimado (solo reserva individual) */}
          {!isRecurring && price > 0 && (
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
            {saving ? "Guardando…" : isRecurring ? "Crear reservas recurrentes" : "Confirmar reserva"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
