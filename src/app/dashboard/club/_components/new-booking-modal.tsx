"use client"
import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { ChevronDown, X, UserPlus, Plus, Trash2 } from "lucide-react"
import { normalizeText } from "@/lib/normalize-text"

const TIME_SLOTS: string[] = []
for (let h = 7; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`)
  if (h < 23) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`)
}

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const DAYS_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"]

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"
const BORDER = "rgba(201,168,76,0.2)"

type BookingType = "simple" | "recurring" | "class"
type TimeSlot = { id: string; startTime: string; endTime: string }

function TimeSelect({ value, onChange, label, minTime, allowedRange }: { value: string; onChange: (v: string) => void; label: string; minTime?: string; allowedRange?: { start: string; end: string }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])
  let slots = minTime ? TIME_SLOTS.filter(t => t > minTime) : TIME_SLOTS
  if (allowedRange && allowedRange.length > 0) {
    slots = slots.filter(t => allowedRange.some(r => t >= r.start && t < r.end))
  }
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
            {slots.map(t => (
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

type NewClientForm = { name: string; rut: string; email: string; phone: string }
type Client = { id: string; name: string; lastName: string | null; email: string | null; phone: string | null; rut: string | null; creditBalance?: number }
type CoachFeeRule = { days: number[]; startTime: string; endTime: string; classPrice: number }
type Coach = { id: string; name: string; color: string; paymentType: string; feeRules: CoachFeeRule[] }

function ClientCombobox({ clients, businessId, value, onSelect }: {
  clients: Client[]
  businessId: string
  value: { id: string; name: string; email?: string; phone?: string; creditBalance?: number } | null
  onSelect: (v: { id: string; name: string; email?: string; phone?: string; creditBalance?: number } | null) => void
}) {
  const [query, setQuery] = useState(value?.name || "")
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState<NewClientForm | null>(null)
  const [serverResults, setServerResults] = useState<Client[] | null>(null)
  const [searching, setSearching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function handleQueryChange(val: string) {
    setQuery(val)
    setOpen(true)
    onSelect(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = val.trim()
    if (trimmed.length < 2) { setServerResults(null); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/businesses/${businessId}/clients?search=${encodeURIComponent(trimmed)}`)
        if (r.ok) { const d = await r.json(); setServerResults(d.clients ?? []) }
      } finally { setSearching(false) }
    }, 300)
  }

  const q = normalizeText(query.trim())
  const filtered = serverResults !== null
    ? serverResults
    : q.length > 0
      ? clients.filter(c => {
          const fullName = normalizeText([c.name, c.lastName].filter(Boolean).join(" "))
          return fullName.includes(q) ||
            normalizeText(c.email ?? "").includes(q) ||
            (c.phone ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
            (c.rut ?? "").replace(/[.\-]/g, "").includes(q.replace(/[.\-]/g, ""))
        })
      : clients
  const exactMatch = (serverResults ?? clients).find(c => normalizeText([c.name, c.lastName].filter(Boolean).join(" ")) === q)

  function startCreating() { setOpen(false); setCreating({ name: query.trim(), email: "", phone: "", rut: "" }) }
  function confirmCreate() {
    if (!creating?.name.trim() || !creating?.rut?.trim()) return
    onSelect({ id: "", name: creating.name.trim(), email: creating.email.trim() || undefined, phone: creating.phone.trim() || undefined, rut: creating.rut.trim() || undefined })
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
          {(["name", "rut", "email", "phone"] as const).map(field => (
            <input key={field} value={creating[field]}
              onChange={e => setCreating(f => f ? { ...f, [field]: e.target.value } : f)}
              placeholder={field === "name" ? "Nombre *" : field === "rut" ? "RUT *" : field === "email" ? "Email (opcional)" : "Teléfono (opcional)"}
              className="w-full h-9 rounded-lg px-3 text-sm"
              style={{ border: "1px solid rgba(13,27,42,0.15)", background: "#f5f4f0", color: NAVY, outline: "none" }} />
          ))}
          <div className="flex gap-2 pt-0.5">
            <button type="button" onClick={() => { setCreating(null); onSelect(null) }}
              className="flex-1 h-8 rounded-lg text-xs font-medium"
              style={{ border: "1px solid rgba(13,27,42,0.12)", color: "rgba(13,27,42,0.45)", background: "#f5f4f0" }}>
              Cancelar
            </button>
            <button type="button" onClick={confirmCreate} disabled={!creating.name.trim() || !creating.rut.trim()}
              className="flex-1 h-8 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input value={query} onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => setOpen(true)} placeholder="Buscar o dejar sin cliente…"
            className="w-full h-10 rounded-xl px-4 text-sm"
            style={{ border: BORDER, background: "#f5f4f0", color: NAVY, outline: "none" }} />
          {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: "rgba(13,27,42,0.3)" }}>…</span>}
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
                      onClick={() => { onSelect({ id: c.id, name: c.name, email: c.email ?? undefined, phone: c.phone ?? undefined, creditBalance: c.creditBalance }); setQuery([c.name, c.lastName].filter(Boolean).join(" ")); setServerResults(null); setOpen(false) }}
                      className="w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center gap-2"
                      style={{ color: NAVY }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: NAVY }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">{[c.name, c.lastName].filter(Boolean).join(" ")}</p>
                        {(c.email || c.phone) && (
                          <p className="text-[10px] truncate" style={{ color: "rgba(13,27,42,0.4)" }}>
                            {c.email ?? c.phone}
                          </p>
                        )}
                      </div>
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

function localToIso(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString()
}

type PricingRule = { id: string; name: string; days: number[]; startTime: string; endTime: string; price: number; fixedSlots?: string[]; paymentPlayers?: number }
type Court = { id: string; name: string; sport: string | null; color: string; isActive?: boolean; pricingRules?: PricingRule[] }

function calcPrice(court: Court | undefined, startTime: string, endTime: string, date: string): number {
  if (!court?.pricingRules?.length || !startTime || !endTime || !date) return 0
  const start = new Date(`${date}T${startTime}`)
  const end = new Date(`${date}T${endTime}`)
  if (end <= start) return 0
  const dayOfWeek = start.getDay()
  // Calcular proporcional si la reserva cruza cambio de tarifa
  let total = 0
  let cursor = new Date(start)
  while (cursor < end) {
    const h = String(cursor.getHours()).padStart(2, "0")
    const m = String(cursor.getMinutes()).padStart(2, "0")
    const ct = `${h}:${m}`
    const rule = court.pricingRules.find(r => r.days.includes(dayOfWeek) && ct >= r.startTime && ct < r.endTime)
    if (!rule) { cursor = new Date(cursor.getTime() + 60_000); continue }
    const [reh, rem] = rule.endTime.split(":").map(Number)
    const ruleEnd = new Date(new Date(cursor).setHours(reh, rem, 0, 0))
    const segEnd = ruleEnd < end ? ruleEnd : end
    const segHours = (segEnd.getTime() - cursor.getTime()) / (1000 * 60 * 60)
    total += rule.fixedSlots?.length ? Number(rule.price) : Number(rule.price) * segHours
    cursor = segEnd
  }
  return total
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
  { key: "recurring", label: "Reserva múltiple", desc: "Varias canchas u horarios" },
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

  // ── Estado común ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    courtId: preselect?.courtId || courts[0]?.id || "",
    date: preselect?.date || new Date().toISOString().slice(0, 10),
    startTime: preselect?.startTime || "09:00",
    endTime: preselect?.endTime || "10:00",
    notes: "",
  })
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; email?: string; phone?: string; creditBalance?: number } | null>(null)
  const [useCredit, setUseCredit] = useState(false)
  const [selectedCoachId, setSelectedCoachId] = useState<string>("")
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [saving, setSaving] = useState(false)
  const [allCourts, setAllCourts] = useState<Court[]>(courts)
  const [bookedCourtIds, setBookedCourtIds] = useState<Set<string>>(new Set())

  // Deporte fijo para la sesión: viene de la cancha preseleccionada (clic en calendario)
  // Se usa como filtro permanente en reserva múltiple aunque se deseleccionen todas las canchas
  const contextSport = preselect?.courtId
    ? (courts.find(c => c.id === preselect.courtId)?.sport ?? null)
    : null

  // ── Estado Reserva múltiple ───────────────────────────────────────────────
  const [multiCourtIds, setMultiCourtIds] = useState<string[]>(
    preselect?.courtId ? [preselect.courtId] : (courts[0]?.id ? [courts[0].id] : [])
  )
  const [multiSlots, setMultiSlots] = useState<TimeSlot[]>([
    { id: "1", startTime: preselect?.startTime || "09:00", endTime: preselect?.endTime || "10:00" }
  ])
  const [multiRangeEnd, setMultiRangeEnd] = useState("")
  // días de la semana seleccionados (0=dom … 6=sáb); se inicializa con el día de la fecha
  const [multiDays, setMultiDays] = useState<number[]>([])

  // ── Estado Clase particular ────────────────────────────────────────────────
  const [classCourtIds, setClassCourtIds] = useState<string[]>(
    preselect?.courtId ? [preselect.courtId] : (courts[0]?.id ? [courts[0].id] : [])
  )
  const [classRecurring, setClassRecurring] = useState(false)
  const [classRangeEnd, setClassRangeEnd] = useState("")
  const [classDays, setClassDays] = useState<number[]>([])

  function handleSetBookingType(type: BookingType) {
    setBookingType(type)
    if (type === "class") {
      const [sh, sm] = form.startTime.split(":").map(Number)
      const endMins = sh * 60 + sm + 60
      const endH = Math.min(Math.floor(endMins / 60), 23)
      const endM = endMins % 60
      setForm(f => ({ ...f, endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}` }))
    }
  }

  useEffect(() => {
    fetch(`/api/businesses/${businessId}/courts`).then(r => r.json()).then(d => setAllCourts(d.courts || []))
    fetch(`/api/businesses/${businessId}/club-coaches`).then(r => r.json()).then(d => setCoaches((d.coaches || []).filter((c: Coach & { isActive: boolean }) => c.isActive)))
  }, [businessId])

  const activeCourts = allCourts.filter(c => c.isActive !== false)
  const selectedDayOfWeek = form.date ? new Date(form.date + "T00:00:00Z").getUTCDay() : -1

  // Inicializar multiDays y classDays con el día de la fecha cuando cambia
  useEffect(() => {
    if (selectedDayOfWeek >= 0) {
      setMultiDays(prev => prev.length === 0 ? [selectedDayOfWeek] : prev)
      setClassDays(prev => prev.length === 0 ? [selectedDayOfWeek] : prev)
    }
  }, [selectedDayOfWeek])

  // Limpiar días seleccionados que no estén cubiertos por las canchas seleccionadas
  useEffect(() => {
    const selectedCourts = activeCourts.filter(c => multiCourtIds.includes(c.id))
    if (selectedCourts.length === 0) return
    const availableDays = selectedCourts.reduce((acc, court) => {
      if (!court.pricingRules?.length) { for (let d = 0; d < 7; d++) acc.add(d) }
      else court.pricingRules.forEach(r => r.days.forEach(d => acc.add(d)))
      return acc
    }, new Set<number>())
    setMultiDays(prev => {
      const filtered = prev.filter(d => availableDays.has(d))
      if (filtered.length === 0) {
        // Mantener al menos el primer día disponible
        const first = [0,1,2,3,4,5,6].find(d => availableDays.has(d))
        return first !== undefined ? [first] : prev
      }
      return filtered.length === prev.length ? prev : filtered
    })
  }, [multiCourtIds.join(",")])

  // Consultar reservas existentes para detectar canchas ocupadas en los slots seleccionados
  useEffect(() => {
    if (!form.date || bookingType !== "recurring") { setBookedCourtIds(new Set()); return }
    const slots = multiSlots.filter(s => s.startTime && s.endTime)
    if (slots.length === 0) { setBookedCourtIds(new Set()); return }
    const from = `${form.date}T00:00:00.000Z`
    const to   = `${form.date}T23:59:59.999Z`
    fetch(`/api/businesses/${businessId}/court-bookings?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        const bookings: { courtId: string; startTime: string; endTime: string }[] = d.bookings || []
        const busy = new Set<string>()
        for (const slot of slots) {
          const slotStart = new Date(`${form.date}T${slot.startTime}:00`)
          const slotEnd   = new Date(`${form.date}T${slot.endTime}:00`)
          for (const b of bookings) {
            const bStart = new Date(b.startTime)
            const bEnd   = new Date(b.endTime)
            if (bStart < slotEnd && bEnd > slotStart) busy.add(b.courtId)
          }
        }
        setBookedCourtIds(busy)
        // Deseleccionar canchas que quedaron ocupadas
        setMultiCourtIds(prev => prev.filter(id => !busy.has(id)))
      })
  }, [form.date, multiSlots, bookingType, businessId])

  function toggleClassDay(day: number) {
    setClassDays(prev =>
      prev.includes(day)
        ? prev.length > 1 ? prev.filter(d => d !== day) : prev
        : [...prev, day].sort((a, b) => a - b)
    )
  }

  function toggleMultiDay(day: number) {
    setMultiDays(prev =>
      prev.includes(day)
        ? prev.length > 1 ? prev.filter(d => d !== day) : prev // mínimo 1 día
        : [...prev, day].sort((a, b) => a - b)
    )
  }

  // ── Fixed slots para Reserva común ───────────────────────────────────────
  const selectedCourt = allCourts.find(c => c.id === form.courtId)
  const selectedCoach = coaches.find(c => c.id === selectedCoachId)
  const classCourt = allCourts.find(c => c.id === classCourtIds[0])

  const activeRuleWithSlots = selectedCourt?.pricingRules?.find(rule =>
    (rule.fixedSlots?.length ?? 0) > 0 &&
    rule.days.includes(selectedDayOfWeek) &&
    (!form.startTime || (form.startTime >= rule.startTime && form.startTime < rule.endTime))
  )
  const fixedSlots: string[] = activeRuleWithSlots?.fixedSlots ?? []

  // Allowed time ranges from pricing rules for the selected court+day (for TimeSelect filtering)
  const allowedStartRange = selectedDayOfWeek >= 0 && selectedCourt?.pricingRules?.length
    ? selectedCourt.pricingRules
        .filter(r => r.days.includes(selectedDayOfWeek))
        .map(r => ({ start: r.startTime, end: r.endTime }))
    : undefined

  function getSlotEnd(startStr: string): string {
    const idx = fixedSlots.indexOf(startStr)
    if (idx >= 0 && idx < fixedSlots.length - 1) return fixedSlots[idx + 1]
    return activeRuleWithSlots?.endTime ?? ""
  }

  // ── Fixed slots para Reserva múltiple ────────────────────────────────────
  const firstMultiCourt = allCourts.find(c => c.id === multiCourtIds[0])
  const multiActiveRule = firstMultiCourt?.pricingRules?.find(
    rule => (rule.fixedSlots?.length ?? 0) > 0 && rule.days.includes(selectedDayOfWeek)
  )
  const multiFixedSlots: string[] = multiActiveRule?.fixedSlots ?? []

  function getMultiSlotEnd(startStr: string): string {
    const idx = multiFixedSlots.indexOf(startStr)
    if (idx >= 0 && idx < multiFixedSlots.length - 1) return multiFixedSlots[idx + 1]
    return multiActiveRule?.endTime ?? ""
  }

  // Toggle a fixed block in multiSlots
  function toggleFixedBlock(start: string) {
    const end = getMultiSlotEnd(start)
    if (!end) return
    setMultiSlots(prev => {
      const exists = prev.find(s => s.startTime === start && s.endTime === end)
      if (exists) {
        const remaining = prev.filter(s => !(s.startTime === start && s.endTime === end))
        return remaining.length > 0 ? remaining : prev // keep at least 1
      }
      return [...prev, { id: `${start}-${end}`, startTime: start, endTime: end }]
    })
  }

  // When multiFixedSlots become available and current multiSlots don't match, reset to first block
  useEffect(() => {
    if (!multiFixedSlots.length) return
    const allValid = multiSlots.every(s => {
      const expected = getMultiSlotEnd(s.startTime)
      return expected && s.endTime === expected && multiFixedSlots.includes(s.startTime)
    })
    if (!allValid) {
      const firstEnd = multiFixedSlots.length >= 2 ? multiFixedSlots[1] : ""
      if (firstEnd) setMultiSlots([{ id: "1", startTime: multiFixedSlots[0], endTime: firstEnd }])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiFixedSlots.join(","), multiCourtIds[0], form.date])

  // Auto-set endTime when fixed slots are active
  useEffect(() => {
    if (!fixedSlots.length || !form.startTime) return
    const correct = getSlotEnd(form.startTime)
    if (correct && form.endTime !== correct) setForm(f => ({ ...f, endTime: correct }))
  }, [form.courtId, form.date, form.startTime, fixedSlots.join(",")])

  const effectiveEndTime = fixedSlots.length > 0 && form.startTime ? getSlotEnd(form.startTime) : form.endTime

  // ── Precios ───────────────────────────────────────────────────────────────
  const simplePrice = bookingType === "simple"
    ? calcPrice(selectedCourt, form.startTime, effectiveEndTime, form.date)
    : bookingType === "class"
    ? calcClassPrice(selectedCoach, form.startTime, effectiveEndTime, form.date)
    : 0

  // Para Reserva múltiple: precio referencial (primer court × todos los slots)
  const multiRefCourt = allCourts.find(c => c.id === multiCourtIds[0])
  const multiTotalPrice = multiSlots.reduce((sum, s) => sum + calcPrice(multiRefCourt, s.startTime, s.endTime, form.date), 0) * Math.max(1, multiCourtIds.length)

  // ── Recurrencia ───────────────────────────────────────────────────────────
  const effectiveClassDays = classDays.length > 0 ? classDays : [selectedDayOfWeek]
  const classSessionCount = classRecurring
    ? effectiveClassDays.reduce((sum, day) => sum + countOccurrences(form.date, classRangeEnd, day), 0)
    : 0
  // Total de semanas sumando cada día seleccionado
  const multiSessionCount = multiRangeEnd
    ? multiDays.reduce((sum, day) => sum + countOccurrences(form.date, multiRangeEnd, day), 0)
    : 0

  // ── Helpers multi-slot ────────────────────────────────────────────────────
  function addMultiSlot() {
    const last = multiSlots[multiSlots.length - 1]
    const [eh, em] = last.endTime.split(":").map(Number)
    const newEndMins = eh * 60 + em + 60
    setMultiSlots(prev => [...prev, {
      id: String(Date.now()),
      startTime: last.endTime,
      endTime: `${String(Math.min(Math.floor(newEndMins / 60), 23)).padStart(2, "0")}:${String(newEndMins % 60).padStart(2, "0")}`,
    }])
  }

  function removeMultiSlot(id: string) {
    setMultiSlots(prev => prev.filter(s => s.id !== id))
  }

  function updateMultiSlot(id: string, field: "startTime" | "endTime", value: string) {
    setMultiSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  function toggleMultiCourt(courtId: string) {
    setMultiCourtIds(prev =>
      prev.includes(courtId) ? prev.filter(id => id !== courtId) : [...prev, courtId]
    )
  }

  // ── Resolve client ────────────────────────────────────────────────────────
  async function resolveClientId(): Promise<string | null> {
    if (!selectedClient) return null
    if (selectedClient.id) return selectedClient.id
    const body: Record<string, string | null> = {
      name: selectedClient.name,
      email: selectedClient.email || null,
      phone: selectedClient.phone || null,
    }
    if ((selectedClient as { rut?: string }).rut) body.rut = (selectedClient as { rut?: string }).rut!
    const cr = await fetch(`/api/businesses/${businessId}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (cr.ok) { const cd = await cr.json(); return cd.client?.id || null }
    // 409 = RUT o email duplicado — buscar el cliente existente y usarlo
    if (cr.status === 409) {
      const search = selectedClient.email || (selectedClient as { rut?: string }).rut || selectedClient.name
      const sr = await fetch(`/api/businesses/${businessId}/clients?search=${encodeURIComponent(search)}`)
      if (sr.ok) { const sd = await sr.json(); return sd.clients?.[0]?.id || null }
    }
    return null
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.date) { toast.error("Selecciona una fecha"); return }

    if (bookingType === "simple") {
      if (!form.courtId) { toast.error("Selecciona una cancha"); return }
    }
    if (bookingType === "recurring") {
      if (multiCourtIds.length === 0) { toast.error("Selecciona al menos una cancha"); return }
    }
    if (bookingType === "class") {
      if (!selectedCoachId) { toast.error("Selecciona un entrenador"); return }
      if (classCourtIds.length === 0) { toast.error("Selecciona al menos una cancha"); return }
      if (classRecurring && !classRangeEnd) { toast.error("Selecciona una fecha de término para la recurrencia"); return }
    }

    setSaving(true)
    try {
      const clientId = await resolveClientId()

      // ── Clase particular ──────────────────────────────────────────────────
      if (bookingType === "class") {
        if (classRecurring) {
          const [startHour, startMinute] = form.startTime.split(":").map(Number)
          const [endHour, endMinute] = effectiveEndTime.split(":").map(Number)
          const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
          if (durationMinutes <= 0) { toast.error("El horario de fin debe ser posterior al de inicio"); setSaving(false); return }

          const days = effectiveClassDays
          let totalCreated = 0
          const conflictDates: string[] = []
          for (const courtId of classCourtIds) {
            for (const day of days) {
              const r = await fetch(`/api/businesses/${businessId}/recurring-bookings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  courtId, clientId, coachId: selectedCoachId,
                  dayOfWeek: day, startHour, startMinute, durationMinutes,
                  rangeStart: form.date, rangeEnd: classRangeEnd, notes: form.notes || null,
                }),
              })
              const d = await r.json()
              if (r.ok) { totalCreated += d.created ?? 0; conflictDates.push(...(d.conflicts ?? [])) }
            }
          }
          if (totalCreated > 0) {
            toast.success(`${totalCreated} clase${totalCreated !== 1 ? "s" : ""} creada${totalCreated !== 1 ? "s" : ""}`)
            if (conflictDates.length > 0) {
              const fmt = (s: string) => { const [y,m,d] = s.split("-"); return `${d}/${m}/${y}` }
              toast.warning(`${conflictDates.length} fecha${conflictDates.length !== 1 ? "s" : ""} sin reservar por conflicto:\n${conflictDates.map(fmt).join(", ")}`, { duration: 10000 })
            }
            onSaved()
          } else {
            toast.error("No se pudieron crear clases — verifica disponibilidad")
          }
        } else {
          const resolvedEnd = fixedSlots.length > 0 ? getSlotEnd(form.startTime) : form.endTime
          const startIso = localToIso(form.date, `${form.startTime}:00`)
          const endIso = localToIso(form.date, `${resolvedEnd}:00`)
          const results = await Promise.all(classCourtIds.map(courtId =>
            fetch(`/api/businesses/${businessId}/court-bookings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ courtId, clientId, coachId: selectedCoachId, startTime: startIso, endTime: endIso, notes: form.notes || null }),
            })
          ))
          const errors = await Promise.all(results.filter(r => !r.ok).map(r => r.json()))
          const created = results.filter(r => r.ok).length
          if (created > 0) {
            const suffix = classCourtIds.length > 1 ? ` en ${created} cancha${created !== 1 ? "s" : ""}` : ""
            toast.success(`Clase particular creada${suffix}`)
            onSaved()
          } else {
            toast.error(errors[0]?.error || "Error al crear")
          }
        }
        return
      }

      // ── Reserva común ─────────────────────────────────────────────────────
      if (bookingType === "simple") {
        const resolvedEnd = fixedSlots.length > 0 && form.startTime ? getSlotEnd(form.startTime) : form.endTime
        const r = await fetch(`/api/businesses/${businessId}/court-bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId: form.courtId, clientId,
            startTime: localToIso(form.date, `${form.startTime}:00`),
            endTime: localToIso(form.date, `${resolvedEnd}:00`),
            notes: form.notes || null,
          }),
        })
        if (r.ok) {
          if (useCredit && clientId && selectedClient?.creditBalance && selectedClient.creditBalance > 0) {
            const deduct = Math.min(selectedClient.creditBalance, simplePrice)
            await fetch(`/api/businesses/${businessId}/clients/${clientId}/credit`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount: deduct }),
            })
            toast.success(`Reserva creada — $${deduct.toLocaleString("es-CL")} descontados del crédito`)
          } else {
            toast.success("Reserva creada")
          }
          onSaved()
        } else {
          const d = await r.json(); toast.error(d.error || "Error al crear")
        }
        return
      }

      // ── Reserva múltiple ──────────────────────────────────────────────────
      // Con recurrencia semanal: recurring-bookings por cada día × cancha × slot
      if (multiRangeEnd) {
        const effectiveDays = multiDays.length > 0 ? multiDays : [selectedDayOfWeek]
        let totalCreated = 0
        const conflictDates: string[] = []
        for (const day of effectiveDays) {
          for (const courtId of multiCourtIds) {
            for (const slot of multiSlots) {
              const [startHour, startMinute] = slot.startTime.split(":").map(Number)
              const [endHour, endMinute] = slot.endTime.split(":").map(Number)
              const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
              if (durationMinutes <= 0) continue
              const r = await fetch(`/api/businesses/${businessId}/recurring-bookings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  courtId, clientId, dayOfWeek: day, startHour, startMinute, durationMinutes,
                  rangeStart: form.date, rangeEnd: multiRangeEnd, notes: form.notes || null,
                }),
              })
              const d = await r.json()
              if (r.ok) { totalCreated += d.created ?? 0; conflictDates.push(...(d.conflicts ?? [])) }
            }
          }
        }
        if (totalCreated > 0) {
          toast.success(`${totalCreated} sesión${totalCreated !== 1 ? "es" : ""} creada${totalCreated !== 1 ? "s" : ""}`)
          if (conflictDates.length > 0) {
            const fmt = (s: string) => { const [y,m,d] = s.split("-"); return `${d}/${m}/${y}` }
            toast.warning(`${conflictDates.length} fecha${conflictDates.length !== 1 ? "s" : ""} sin reservar por conflicto:\n${conflictDates.map(fmt).join(", ")}`, { duration: 10000 })
          }
          onSaved()
        } else {
          toast.error("No se pudieron crear sesiones — verifica disponibilidad")
        }
        return
      }

      // Sin recurrencia: N canchas × M días × M slots como reservas únicas
      function getDateForDay(fromDate: string, targetDay: number): string {
        const d = new Date(fromDate + "T00:00:00Z")
        const diff = (targetDay - d.getUTCDay() + 7) % 7
        d.setUTCDate(d.getUTCDate() + diff)
        return d.toISOString().slice(0, 10)
      }
      const effectiveDays = multiDays.length > 0 ? multiDays : [selectedDayOfWeek]
      const promises = multiCourtIds.flatMap(courtId =>
        effectiveDays.flatMap(day =>
          multiSlots.map(slot => {
            const bookingDate = getDateForDay(form.date, day)
            return fetch(`/api/businesses/${businessId}/court-bookings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                courtId, clientId,
                startTime: localToIso(bookingDate, `${slot.startTime}:00`),
                endTime: localToIso(bookingDate, `${slot.endTime}:00`),
                notes: form.notes || null,
              }),
            })
          })
        )
      )
      const results = await Promise.all(promises)
      const ok = results.filter(r => r.ok).length
      const failed = results.length - ok
      if (ok === results.length) {
        toast.success(`${ok} reserva${ok !== 1 ? "s" : ""} creada${ok !== 1 ? "s" : ""}`)
        onSaved()
      } else if (ok > 0) {
        toast.warning(`${ok} creada${ok !== 1 ? "s" : ""}, ${failed} con conflicto`)
        onSaved()
      } else {
        toast.error("No se pudo crear ninguna reserva — verifica disponibilidad")
      }
    } finally {
      setSaving(false)
    }
  }

  const labelCls = "text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5"
  const inputCls = "w-full h-10 rounded-xl px-4 text-sm font-medium"
  const inputStyle = { border: BORDER, background: "#f5f4f0", color: NAVY, outline: "none" }

  // Texto del botón guardar
  const saveLabel = (() => {
    if (saving) return "Guardando…"
    if (bookingType === "class") return classRecurring ? "Crear clases recurrentes" : "Crear clase particular"
    if (bookingType === "simple") return "Confirmar reserva"
    // recurring
    const days = multiDays.length || 1
    const total = multiCourtIds.length * multiSlots.length * days
    if (multiRangeEnd && multiSessionCount > 0) {
      const grand = multiCourtIds.length * multiSlots.length * multiSessionCount
      return `Crear ${grand} reserva${grand !== 1 ? "s" : ""}`
    }
    return total > 1 ? `Crear ${total} reserva${total !== 1 ? "s" : ""}` : "Confirmar reserva"
  })()

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

          {/* Tipo de reserva */}
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

          {/* ══════════════ RESERVA COMÚN ══════════════ */}
          {bookingType === "simple" && (<>
            <div>
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Cancha</p>
              <div className="relative">
                <select value={form.courtId} onChange={e => setForm(f => ({ ...f, courtId: e.target.value }))}
                  className={inputCls + " appearance-none pr-9"} style={inputStyle}>
                  <option value="" disabled>Seleccionar cancha</option>
                  {activeCourts.map(c => {
                    const unavailable = selectedDayOfWeek >= 0 && (c.pricingRules?.length ?? 0) > 0 && !c.pricingRules?.some(r => r.days.includes(selectedDayOfWeek))
                    return <option key={c.id} value={c.id} disabled={unavailable}>{unavailable ? "🚫 " : ""}{c.name}{c.sport ? ` (${c.sport})` : ""}{unavailable ? " — sin horario este día" : ""}</option>
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: GOLD }} />
              </div>
            </div>

            <ClientCombobox clients={clients} businessId={businessId} value={selectedClient} onSelect={setSelectedClient} />

            <div>
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Fecha</p>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
            </div>

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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "rgba(13,27,42,0.4)" }}>Duración</span>
                  {[60, 90, 120].map(mins => {
                    const [sh, sm] = form.startTime.split(":").map(Number)
                    const totalMins = sh * 60 + sm + mins
                    const calcEnd = `${String(Math.floor(totalMins / 60)).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`
                    const isActive = form.endTime === calcEnd
                    return (
                      <button key={mins} type="button"
                        onClick={() => setForm(f => ({ ...f, endTime: calcEnd }))}
                        className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: isActive ? "#C9A84C" : "rgba(201,168,76,0.1)",
                          color: isActive ? "#fff" : "#C9A84C",
                          border: `1px solid ${isActive ? "#C9A84C" : "rgba(201,168,76,0.3)"}`,
                        }}>
                        {mins} min
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TimeSelect label="Inicio" value={form.startTime} onChange={v => setForm(f => ({ ...f, startTime: v }))} allowedRange={allowedStartRange} />
                  <TimeSelect label="Fin" value={form.endTime} onChange={v => setForm(f => ({ ...f, endTime: v }))} minTime={form.startTime} allowedRange={allowedStartRange} />
                </div>
              </div>
            )}

            {simplePrice > 0 && (
              <div className="space-y-2">
                <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
                  style={{ background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)` }}>
                  <p className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>Precio estimado</p>
                  <p className="text-sm font-black" style={{ color: GOLD }}>${simplePrice.toLocaleString("es-CL")}</p>
                </div>
                {selectedClient?.creditBalance && selectedClient.creditBalance > 0 ? (
                  <button type="button" onClick={() => setUseCredit(v => !v)}
                    className="w-full rounded-xl px-4 py-2.5 flex items-center justify-between transition-all"
                    style={{
                      background: useCredit ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.04)",
                      border: `1px solid ${useCredit ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.2)"}`,
                    }}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: useCredit ? "#22c55e" : "transparent", border: useCredit ? "none" : "1.5px solid rgba(34,197,94,0.5)" }}>
                        {useCredit && <span className="text-white text-[9px] font-black">✓</span>}
                      </div>
                      <p className="text-xs font-semibold" style={{ color: "#16a34a" }}>
                        Usar crédito — ${selectedClient.creditBalance.toLocaleString("es-CL")} disponibles
                      </p>
                    </div>
                    {useCredit && (
                      <p className="text-xs font-black" style={{ color: "#16a34a" }}>
                        −${Math.min(selectedClient.creditBalance, simplePrice).toLocaleString("es-CL")}
                      </p>
                    )}
                  </button>
                ) : null}
              </div>
            )}
          </>)}

          {/* ══════════════ RESERVA MÚLTIPLE ══════════════ */}
          {bookingType === "recurring" && (<>

            {/* Canchas — grid compacto, filtrado por deporte */}
            {(() => {
              const firstSelected = activeCourts.find(c => multiCourtIds.includes(c.id))
              const activeSport = firstSelected?.sport ?? contextSport
              const sameSport = activeSport
                ? activeCourts.filter(c => c.sport === activeSport)
                : activeCourts
              const otherSport = activeSport
                ? activeCourts.filter(c => c.sport !== activeSport)
                : []
              // Canchas sin horario configurado para el día seleccionado
              const isUnavailableDay = (court: Court) =>
                selectedDayOfWeek >= 0 &&
                (court.pricingRules?.length ?? 0) > 0 &&
                !court.pricingRules?.some(r => r.days.includes(selectedDayOfWeek))
              const isBlocked = (court: Court) => bookedCourtIds.has(court.id) || isUnavailableDay(court)
              return (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>
                      Canchas {multiCourtIds.length > 0 && <span style={{ color: GOLD }}>({multiCourtIds.length})</span>}
                      {activeSport && <span className="ml-1 text-[10px]" style={{ color: "rgba(13,27,42,0.3)" }}>· {activeSport}</span>}
                    </p>
                    <div className="flex gap-1.5">
                      {multiCourtIds.length > 0 && (
                        <button type="button" onClick={() => setMultiCourtIds([])}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded"
                          style={{ color: "rgba(13,27,42,0.35)" }}>
                          Ninguna
                        </button>
                      )}
                      <button type="button"
                        onClick={() => setMultiCourtIds(sameSport.filter(c => !isBlocked(c)).map(c => c.id))}
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ color: GOLD, background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.2)` }}>
                        Todas
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {sameSport.map(court => {
                      const isSelected = multiCourtIds.includes(court.id)
                      const blocked = isBlocked(court)
                      const isBooked = bookedCourtIds.has(court.id)
                      const isNoDay  = isUnavailableDay(court)
                      return (
                        <button key={court.id} type="button"
                          disabled={blocked}
                          onClick={() => !blocked && toggleMultiCourt(court.id)}
                          className="flex items-center gap-2.5 px-3 py-2 text-left transition-all rounded-lg"
                          style={blocked
                            ? { background: "rgba(13,27,42,0.02)", borderLeft: `3px solid rgba(13,27,42,0.1)`, border: "1px solid rgba(13,27,42,0.05)", borderLeftWidth: "3px", borderLeftColor: "rgba(13,27,42,0.1)", opacity: 0.45, cursor: "not-allowed" }
                            : isSelected
                              ? { background: NAVY, borderLeft: `3px solid ${court.color}` }
                              : { background: "rgba(13,27,42,0.04)", borderLeft: `3px solid ${court.color}`, border: `1px solid rgba(13,27,42,0.08)`, borderLeftWidth: "3px", borderLeftColor: court.color }}>
                          <span className="text-xs font-semibold truncate flex-1"
                            style={{ color: blocked ? "rgba(13,27,42,0.3)" : isSelected ? "#fff" : NAVY }}>
                            {court.name}
                          </span>
                          {blocked && (
                            <span className="text-[9px] flex-shrink-0" style={{ color: "rgba(13,27,42,0.3)" }}>
                              {isBooked ? "ocupada" : isNoDay ? "sin horario" : ""}
                            </span>
                          )}
                          {!blocked && isSelected && (
                            <span className="text-[9px] font-black flex-shrink-0" style={{ color: GOLD }}>✓</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {otherSport.length > 0 && (
                    <p className="text-[10px] mt-1.5" style={{ color: "rgba(13,27,42,0.3)" }}>
                      {otherSport.map(c => c.name).join(", ")} — deporte distinto
                    </p>
                  )}
                  {multiCourtIds.length === 0 && (
                    <p className="text-[10px] mt-1.5" style={{ color: "rgba(201,168,76,0.7)" }}>Selecciona al menos una cancha</p>
                  )}
                </div>
              )
            })()}

            <ClientCombobox clients={clients} businessId={businessId} value={selectedClient} onSelect={setSelectedClient} />

            <div>
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Fecha de inicio</p>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
            </div>

            {/* Horarios múltiples */}
            <div className="space-y-2">
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Horarios</p>

              {multiFixedSlots.length >= 2 ? (
                /* Bloques fijos — igual que reserva común */
                <div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {multiFixedSlots.slice(0, -1).map((start, i) => {
                      const end = multiFixedSlots[i + 1]
                      const isSelected = multiSlots.some(s => s.startTime === start && s.endTime === end)
                      const price = calcPrice(firstMultiCourt, start, end, form.date)
                      return (
                        <button key={start} type="button" onClick={() => toggleFixedBlock(start)}
                          className="rounded-xl py-2.5 px-2 flex flex-col items-center gap-0.5 transition-all"
                          style={isSelected
                            ? { background: NAVY, border: `1.5px solid ${GOLD}` }
                            : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.08)" }}>
                          <span className="text-[11px] font-black" style={{ color: isSelected ? "#fff" : NAVY }}>
                            {start}
                          </span>
                          <span className="text-[9px]" style={{ color: isSelected ? "rgba(255,255,255,0.5)" : "rgba(13,27,42,0.35)" }}>
                            {end}
                          </span>
                          {price > 0 && (
                            <span className="text-[9px] font-bold mt-0.5" style={{ color: GOLD }}>
                              ${price.toLocaleString("es-CL")}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {multiSlots.length === 0 && (
                    <p className="text-[10px] mt-1.5" style={{ color: "rgba(201,168,76,0.7)" }}>Selecciona al menos un bloque</p>
                  )}
                </div>
              ) : (
                /* Sin bloques fijos — inicio + botones de duración (igual que reserva común) */
                <>
                  {multiSlots.map((slot, idx) => {
                    function calcMultiEnd(start: string, mins: number): string {
                      const [sh, sm] = start.split(":").map(Number)
                      const total = sh * 60 + sm + mins
                      return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
                    }
                    return (
                      <div key={slot.id} className="rounded-xl p-2.5 space-y-2"
                        style={idx === 0
                          ? { background: "rgba(13,27,42,0.03)", border: "1px solid rgba(13,27,42,0.08)" }
                          : { background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: idx === 0 ? "rgba(13,27,42,0.4)" : GOLD }}>
                            Horario {idx + 1}
                          </span>
                          {multiSlots.length > 1 && (
                            <button type="button" onClick={() => removeMultiSlot(slot.id)}
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ color: "rgba(201,68,68,0.6)", background: "rgba(201,68,68,0.06)" }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "rgba(13,27,42,0.4)" }}>Duración</span>
                          {[60, 90, 120].map(mins => {
                            const calcEnd = calcMultiEnd(slot.startTime, mins)
                            const isActive = slot.endTime === calcEnd
                            return (
                              <button key={mins} type="button"
                                onClick={() => updateMultiSlot(slot.id, "endTime", calcEnd)}
                                className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                                style={{
                                  background: isActive ? "#C9A84C" : "rgba(201,168,76,0.1)",
                                  color: isActive ? "#fff" : "#C9A84C",
                                  border: `1px solid ${isActive ? "#C9A84C" : "rgba(201,168,76,0.3)"}`,
                                }}>
                                {mins} min
                              </button>
                            )
                          })}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <TimeSelect label="Inicio" value={slot.startTime} onChange={v => updateMultiSlot(slot.id, "startTime", v)} />
                          <TimeSelect label="Fin" value={slot.endTime} onChange={v => updateMultiSlot(slot.id, "endTime", v)} minTime={slot.startTime} />
                        </div>
                        {calcPrice(multiRefCourt, slot.startTime, slot.endTime, form.date) > 0 && (
                          <p className="text-[10px] text-right font-bold" style={{ color: GOLD }}>
                            ${calcPrice(multiRefCourt, slot.startTime, slot.endTime, form.date).toLocaleString("es-CL")} / cancha
                          </p>
                        )}
                      </div>
                    )
                  })}
                  <button type="button" onClick={addMultiSlot}
                    className="w-full h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
                    style={{ border: `1.5px dashed rgba(201,168,76,0.4)`, color: GOLD, background: "rgba(201,168,76,0.03)" }}>
                    <Plus className="w-3.5 h-3.5" />
                    Agregar horario
                  </button>
                </>
              )}
            </div>

            {/* Recurrencia semanal opcional */}
            <div className="rounded-xl p-3.5 space-y-3" style={{ border: `1px solid rgba(201,168,76,0.25)`, background: "rgba(201,168,76,0.04)" }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: GOLD }}>Repetición semanal</p>
                <span className="text-[10px]" style={{ color: "rgba(13,27,42,0.4)" }}>opcional</span>
              </div>
              {/* Días de la semana — filtrados por las reglas de las canchas seleccionadas */}
              {(() => {
                // Unión de días disponibles entre todas las canchas seleccionadas
                const selectedCourts = activeCourts.filter(c => multiCourtIds.includes(c.id))
                const availableDays: Set<number> = selectedCourts.length > 0
                  ? selectedCourts.reduce((acc, court) => {
                      if (!court.pricingRules?.length) {
                        // Sin reglas: todos los días disponibles
                        for (let d = 0; d < 7; d++) acc.add(d)
                      } else {
                        court.pricingRules.forEach(r => r.days.forEach(d => acc.add(d)))
                      }
                      return acc
                    }, new Set<number>())
                  : new Set<number>([0,1,2,3,4,5,6]) // sin canchas seleccionadas: mostrar todos
                return (
                  <div>
                    <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Días</p>
                    <div className="flex gap-1">
                      {DAYS_SHORT.map((d, i) => {
                        const isSelected = multiDays.includes(i)
                        const isAvailable = availableDays.has(i)
                        return (
                          <button key={d} type="button"
                            disabled={!isAvailable}
                            onClick={() => isAvailable && toggleMultiDay(i)}
                            className="flex-1 h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-all"
                            style={!isAvailable
                              ? { background: "rgba(13,27,42,0.02)", color: "rgba(13,27,42,0.15)", border: "1px solid rgba(13,27,42,0.04)", cursor: "not-allowed" }
                              : isSelected
                                ? { background: NAVY, color: "#fff" }
                                : { background: "rgba(13,27,42,0.05)", color: "rgba(13,27,42,0.35)", border: "1px solid rgba(13,27,42,0.08)" }}>
                            {d}
                          </button>
                        )
                      })}
                    </div>
                    {multiDays.length > 1 && (
                      <p className="text-[10px] mt-1 font-semibold" style={{ color: GOLD }}>
                        {multiDays.map(d => DAYS_ES[d]).join(" · ")}
                      </p>
                    )}
                  </div>
                )
              })()}
              <div>
                <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Fecha de término (dejar vacío para reserva única)</p>
                <input type="date" value={multiRangeEnd} onChange={e => setMultiRangeEnd(e.target.value)}
                  min={form.date}
                  className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
              </div>
              {multiRangeEnd && multiSessionCount > 0 && (
                <div className="rounded-lg px-3 py-2.5 space-y-1.5"
                  style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px]" style={{ color: "rgba(13,27,42,0.5)" }}>
                    <div>
                      <p className="font-black text-sm" style={{ color: NAVY }}>{multiDays.length || 1}</p>
                      <p>día{(multiDays.length || 1) !== 1 ? "s" : ""}</p>
                    </div>
                    <div>
                      <p className="font-black text-sm" style={{ color: NAVY }}>{multiCourtIds.length}</p>
                      <p>cancha{multiCourtIds.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div>
                      <p className="font-black text-sm" style={{ color: NAVY }}>{multiSlots.length}</p>
                      <p>horario{multiSlots.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid rgba(201,168,76,0.15)" }}>
                    <span className="text-[10px]" style={{ color: "rgba(13,27,42,0.4)" }}>Total reservas</span>
                    <span className="text-sm font-black" style={{ color: GOLD }}>
                      {multiCourtIds.length * multiSlots.length * multiSessionCount}
                    </span>
                  </div>
                </div>
              )}
              {!multiRangeEnd && (multiCourtIds.length * (multiDays.length || 1) * multiSlots.length) > 1 && (
                <div className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                  style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.08)" }}>
                  <span style={{ color: "rgba(13,27,42,0.5)" }}>Se crearán</span>
                  <span className="font-black" style={{ color: NAVY }}>
                    {multiCourtIds.length * (multiDays.length || 1) * multiSlots.length} reservas
                  </span>
                </div>
              )}
            </div>

            {multiTotalPrice > 0 && !multiRangeEnd && (
              <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
                style={{ background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)` }}>
                <p className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>Precio estimado</p>
                <p className="text-sm font-black" style={{ color: GOLD }}>${multiTotalPrice.toLocaleString("es-CL")}</p>
              </div>
            )}
          </>)}

          {/* ══════════════ CLASE PARTICULAR ══════════════ */}
          {bookingType === "class" && (<>
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

            <div>
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>
                Cancha{classCourtIds.length > 1 ? `s (${classCourtIds.length})` : ""}
              </p>
              <div className="flex flex-col gap-1.5">
                {activeCourts.map(c => {
                  const selected = classCourtIds.includes(c.id)
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setClassCourtIds(prev =>
                        prev.includes(c.id)
                          ? prev.length > 1 ? prev.filter(id => id !== c.id) : prev
                          : [...prev, c.id]
                      )}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-all"
                      style={selected
                        ? { background: "rgba(201,168,76,0.1)", border: `1.5px solid ${GOLD}` }
                        : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)" }}>
                      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: selected ? GOLD : "transparent", border: selected ? "none" : "1.5px solid rgba(13,27,42,0.2)" }}>
                        {selected && <span className="text-white text-[10px] font-black">✓</span>}
                      </div>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color || GOLD }} />
                      <p className="text-sm font-semibold truncate" style={{ color: selected ? "#8a6520" : NAVY }}>
                        {c.name}{c.sport ? <span className="font-normal text-xs" style={{ color: "rgba(13,27,42,0.4)" }}> · {c.sport}</span> : ""}
              </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <ClientCombobox clients={clients} businessId={businessId} value={selectedClient} onSelect={setSelectedClient} />

            <div>
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>
                {classRecurring ? "Fecha de inicio" : "Fecha"}
              </p>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <TimeSelect label="Inicio" value={form.startTime} onChange={v => setForm(f => ({ ...f, startTime: v }))} />
              <TimeSelect label="Fin" value={form.endTime} onChange={v => setForm(f => ({ ...f, endTime: v }))} minTime={form.startTime} />
            </div>

            {/* Toggle recurrencia semanal */}
            <button type="button" onClick={() => setClassRecurring(v => !v)}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
              style={classRecurring
                ? { background: "rgba(201,168,76,0.1)", border: `1.5px solid ${GOLD}` }
                : { background: "rgba(13,27,42,0.03)", border: "1px solid rgba(13,27,42,0.1)" }}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: classRecurring ? GOLD : "transparent", border: classRecurring ? "none" : "1.5px solid rgba(13,27,42,0.2)" }}>
                {classRecurring && <span className="text-white text-[10px] font-black">✓</span>}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold" style={{ color: classRecurring ? "#8a6520" : NAVY }}>Repetir semanalmente</p>
                <p className="text-[10px]" style={{ color: "rgba(13,27,42,0.4)" }}>
                  El alumno viene todos los {selectedDayOfWeek >= 0 ? DAYS_ES[selectedDayOfWeek].toLowerCase() + "s" : "…"}
                </p>
              </div>
            </button>

            {classRecurring && (
              <div className="rounded-xl p-3.5 space-y-3" style={{ border: `1px solid rgba(201,168,76,0.25)`, background: "rgba(201,168,76,0.04)" }}>
                {/* Días interactivos */}
                <div>
                  <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Días</p>
                  <div className="flex gap-1">
                    {DAYS_SHORT.map((d, i) => {
                      const isSelected = classDays.includes(i)
                      return (
                        <button key={d} type="button" onClick={() => toggleClassDay(i)}
                          className="flex-1 h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-all"
                          style={isSelected
                            ? { background: NAVY, color: "#fff" }
                            : { background: "rgba(13,27,42,0.05)", color: "rgba(13,27,42,0.35)", border: "1px solid rgba(13,27,42,0.08)" }}>
                          {d}
                        </button>
                      )
                    })}
                  </div>
                  {classDays.length > 1 && (
                    <p className="text-[10px] mt-1 font-semibold" style={{ color: GOLD }}>
                      {classDays.map(d => DAYS_ES[d]).join(" · ")}
                    </p>
                  )}
                </div>
                <div>
                  <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Fecha de término</p>
                  <input type="date" value={classRangeEnd} onChange={e => setClassRangeEnd(e.target.value)}
                    min={form.date}
                    className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
                </div>
                {classSessionCount > 0 && (
                  <div className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                    style={{ background: "rgba(201,168,76,0.1)", color: "#8a6520" }}>
                    <span>Se crearán</span>
                    <span className="font-black">
                      {classSessionCount * classCourtIds.length} clase{classSessionCount * classCourtIds.length !== 1 ? "s" : ""}
                      {classCourtIds.length > 1 ? ` (${classCourtIds.length} canchas × ${classSessionCount})` : ""}
                    </span>
                  </div>
                )}
              </div>
            )}

            {simplePrice > 0 && (
              <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
                style={{ background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)` }}>
                <p className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>
                  {classRecurring && classSessionCount > 0
                    ? `Precio por clase${classCourtIds.length > 1 ? ` × cancha` : ""}`
                    : classCourtIds.length > 1 ? `Precio total (${classCourtIds.length} canchas)` : "Precio estimado"}
                </p>
                <p className="text-sm font-black" style={{ color: GOLD }}>
                  ${(simplePrice * (classRecurring ? 1 : classCourtIds.length)).toLocaleString("es-CL")}
                </p>
              </div>
            )}
          </>)}

          {/* Notas — siempre visible */}
          <div>
            <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Notas</p>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observaciones (opcional)"
              className={inputCls} style={{ ...inputStyle, color: NAVY }} />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full h-11 rounded-xl text-sm font-black uppercase tracking-wide transition-all disabled:opacity-50"
            style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
            {saveLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
