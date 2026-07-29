"use client"
import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { ChevronDown, X, UserPlus, Plus, Trash2 } from "lucide-react"

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

function TimeSelect({ value, onChange, label, minTime }: { value: string; onChange: (v: string) => void; label: string; minTime?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])
  const slots = minTime ? TIME_SLOTS.filter(t => t > minTime) : TIME_SLOTS
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

type NewClientForm = { name: string; email: string; phone: string }
type Client = { id: string; name: string; lastName: string | null; email: string | null; phone: string | null; rut: string | null; creditBalance?: number }
type CoachFeeRule = { days: number[]; startTime: string; endTime: string; classPrice: number }
type Coach = { id: string; name: string; color: string; paymentType: string; feeRules: CoachFeeRule[] }

function ClientCombobox({ clients, value, onSelect }: {
  clients: Client[]
  value: { id: string; name: string; email?: string; phone?: string; creditBalance?: number } | null
  onSelect: (v: { id: string; name: string; email?: string; phone?: string; creditBalance?: number } | null) => void
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

  const q = query.trim().toLowerCase()
  const filtered = q.length > 0
    ? clients.filter(c => {
        const fullName = [c.name, c.lastName].filter(Boolean).join(" ").toLowerCase()
        return fullName.includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
          (c.rut ?? "").replace(/[.\-]/g, "").includes(q.replace(/[.\-]/g, ""))
      })
    : clients
  const exactMatch = clients.find(c => [c.name, c.lastName].filter(Boolean).join(" ").toLowerCase() === q)

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
                      onClick={() => { onSelect({ id: c.id, name: c.name, email: c.email ?? undefined, phone: c.phone ?? undefined, creditBalance: c.creditBalance }); setQuery(c.name); setOpen(false) }}
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

type PricingRule = { id: string; name: string; days: number[]; startTime: string; endTime: string; price: number; fixedSlots?: string[]; paymentPlayers?: number }
type Court = { id: string; name: string; sport: string | null; color: string; isActive?: boolean; pricingRules?: PricingRule[] }

function calcPrice(court: Court | undefined, startTime: string, endTime: string, date: string): number {
  if (!court?.pricingRules?.length || !startTime || !endTime || !date) return 0
  const start = new Date(`${date}T${startTime}`)
  const end = new Date(`${date}T${endTime}`)
  if (end <= start) return 0
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  const dayOfWeek = start.getDay()
  for (const rule of court.pricingRules) {
    if (rule.days.includes(dayOfWeek) && startTime >= rule.startTime && startTime < rule.endTime) {
      if (rule.fixedSlots?.length) return Number(rule.price)
      return Number(rule.price) * durationHours
    }
  }
  return 0
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

  // Multi-court selection (for simple type)
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>(
    preselect?.courtId ? [preselect.courtId] : (courts[0]?.id ? [courts[0].id] : [])
  )

  // Multi-slot state (for simple type: first slot + extras)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: "1", startTime: preselect?.startTime || "09:00", endTime: preselect?.endTime || "10:00" }
  ])

  // Class recurring
  const [classRecurring, setClassRecurring] = useState(false)
  const [classRangeEnd, setClassRangeEnd] = useState("")

  function handleSetBookingType(type: BookingType) {
    setBookingType(type)
    if (type === "class") {
      setTimeSlots(prev => {
        const first = prev[0]
        const [sh, sm] = first.startTime.split(":").map(Number)
        const endMins = sh * 60 + sm + 60
        const endH = Math.min(Math.floor(endMins / 60), 23)
        const endM = endMins % 60
        return [{ ...first, endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}` }]
      })
    }
    if (type !== "simple") {
      setTimeSlots(prev => [prev[0]])
    }
  }

  const [form, setForm] = useState({
    date: preselect?.date || new Date().toISOString().slice(0, 10),
    notes: "",
  })
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; email?: string; phone?: string; creditBalance?: number } | null>(null)
  const [useCredit, setUseCredit] = useState(false)
  const [selectedCoachId, setSelectedCoachId] = useState<string>("")
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [saving, setSaving] = useState(false)
  const [allCourts, setAllCourts] = useState<Court[]>(courts)
  const [rangeEnd, setRangeEnd] = useState("")

  // For recurring (multi-court type), use single court dropdown
  const [recurringCourtId, setRecurringCourtId] = useState(preselect?.courtId || courts[0]?.id || "")
  const [classCourtId, setClassCourtId] = useState(preselect?.courtId || courts[0]?.id || "")

  useEffect(() => {
    fetch(`/api/businesses/${businessId}/courts`).then(r => r.json()).then(d => setAllCourts(d.courts || []))
    fetch(`/api/businesses/${businessId}/club-coaches`).then(r => r.json()).then(d => setCoaches((d.coaches || []).filter((c: Coach & { isActive: boolean }) => c.isActive)))
  }, [businessId])

  const activeCourts = allCourts.filter(c => c.isActive !== false)
  const selectedDayOfWeek = form.date ? new Date(form.date + "T00:00:00Z").getUTCDay() : -1

  // For recurring/class: single court
  const recurringCourt = allCourts.find(c => c.id === recurringCourtId)
  const classCourt = allCourts.find(c => c.id === classCourtId)
  const selectedCoach = coaches.find(c => c.id === selectedCoachId)

  const sessionCount = bookingType === "recurring"
    ? countOccurrences(form.date, rangeEnd, selectedDayOfWeek)
    : classRecurring
    ? countOccurrences(form.date, classRangeEnd, selectedDayOfWeek)
    : 0

  // Fixed slots logic (based on primary court for simple, or respective court for class/recurring)
  function getFixedSlotsForCourt(courtId: string): string[] {
    const court = allCourts.find(c => c.id === courtId)
    if (!court) return []
    const rule = court.pricingRules?.find(r =>
      (r.fixedSlots?.length ?? 0) > 0 &&
      r.days.includes(selectedDayOfWeek)
    )
    return rule?.fixedSlots ?? []
  }

  function getSlotEnd(courtId: string, startStr: string): string {
    const slots = getFixedSlotsForCourt(courtId)
    const idx = slots.indexOf(startStr)
    if (idx >= 0 && idx < slots.length - 1) return slots[idx + 1]
    const court = allCourts.find(c => c.id === courtId)
    const rule = court?.pricingRules?.find(r => (r.fixedSlots?.length ?? 0) > 0 && r.days.includes(selectedDayOfWeek))
    return rule?.endTime ?? ""
  }

  // Primary court for simple mode (first selected, for fixed slots)
  const primaryCourtId = selectedCourtIds[0] ?? ""
  const primaryCourt = allCourts.find(c => c.id === primaryCourtId)
  const primaryFixedSlots = getFixedSlotsForCourt(primaryCourtId)

  // Price calculation for simple mode (per slot, first selected court for reference)
  function slotPrice(slot: TimeSlot): number {
    if (bookingType === "class") {
      return calcClassPrice(selectedCoach, slot.startTime, slot.endTime, form.date)
    }
    return calcPrice(primaryCourt, slot.startTime, slot.endTime, form.date)
  }

  const totalPrice = bookingType !== "recurring"
    ? timeSlots.reduce((sum, s) => sum + slotPrice(s), 0) * (bookingType === "simple" ? Math.max(1, selectedCourtIds.length) : 1)
    : 0

  // Slot helpers
  function addSlot() {
    const last = timeSlots[timeSlots.length - 1]
    const [eh, em] = last.endTime.split(":").map(Number)
    const newStart = last.endTime
    const newEndMins = eh * 60 + em + 60
    const newEnd = `${String(Math.min(Math.floor(newEndMins / 60), 23)).padStart(2, "0")}:${String(newEndMins % 60).padStart(2, "0")}`
    setTimeSlots(prev => [...prev, { id: String(Date.now()), startTime: newStart, endTime: newEnd }])
  }

  function removeSlot(id: string) {
    setTimeSlots(prev => prev.filter(s => s.id !== id))
  }

  function updateSlot(id: string, field: "startTime" | "endTime", value: string) {
    setTimeSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  // Court multi-select helpers
  function toggleCourt(courtId: string) {
    setSelectedCourtIds(prev =>
      prev.includes(courtId) ? prev.filter(id => id !== courtId) : [...prev, courtId]
    )
  }

  function selectAllCourts() {
    setSelectedCourtIds(activeCourts.map(c => c.id))
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
    if (!form.date) { toast.error("Selecciona una fecha"); return }
    if (bookingType === "simple" && selectedCourtIds.length === 0) {
      toast.error("Selecciona al menos una cancha"); return
    }
    if (bookingType === "recurring" && (!recurringCourtId || !rangeEnd)) {
      toast.error("Selecciona cancha y fecha de término"); return
    }
    if (bookingType === "class" && !selectedCoachId) {
      toast.error("Selecciona un entrenador"); return
    }
    if (bookingType === "class" && classRecurring && !classRangeEnd) {
      toast.error("Selecciona una fecha de término para la recurrencia"); return
    }

    setSaving(true)
    try {
      const clientId = await resolveClientId()

      if (bookingType === "recurring") {
        const [startHour, startMinute] = timeSlots[0].startTime.split(":").map(Number)
        const [endHour, endMinute] = timeSlots[0].endTime.split(":").map(Number)
        const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
        if (durationMinutes <= 0) { toast.error("El horario de fin debe ser posterior al de inicio"); setSaving(false); return }

        const r = await fetch(`/api/businesses/${businessId}/recurring-bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId: recurringCourtId, clientId,
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
        return
      }

      if (bookingType === "class" && classRecurring) {
        const [startHour, startMinute] = timeSlots[0].startTime.split(":").map(Number)
        const [endHour, endMinute] = timeSlots[0].endTime.split(":").map(Number)
        const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
        if (durationMinutes <= 0) { toast.error("El horario de fin debe ser posterior al de inicio"); setSaving(false); return }

        const r = await fetch(`/api/businesses/${businessId}/recurring-bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId: classCourtId, clientId, coachId: selectedCoachId,
            dayOfWeek: selectedDayOfWeek, startHour, startMinute, durationMinutes,
            rangeStart: form.date, rangeEnd: classRangeEnd, notes: form.notes || null,
          }),
        })
        const d = await r.json()
        if (r.ok) {
          const msg = [`${d.created} clase${d.created !== 1 ? "s" : ""} creada${d.created !== 1 ? "s" : ""}`]
          if (d.skipped?.length) msg.push(`${d.skipped.length} omitida${d.skipped.length !== 1 ? "s" : ""} por feriado`)
          if (d.conflicts?.length) msg.push(`${d.conflicts.length} con conflicto`)
          toast.success(msg.join(" · "))
          onSaved()
        } else {
          toast.error(d.error || "Error al crear clases recurrentes")
        }
        return
      }

      // Simple or non-recurring class: create N courts × M slots
      const courtsToBook = bookingType === "class" ? [classCourtId] : selectedCourtIds
      const promises: Promise<Response>[] = []
      for (const courtId of courtsToBook) {
        for (const slot of timeSlots) {
          const fixedSlots = getFixedSlotsForCourt(courtId)
          const resolvedEnd = fixedSlots.length > 0 ? getSlotEnd(courtId, slot.startTime) : slot.endTime
          promises.push(
            fetch(`/api/businesses/${businessId}/court-bookings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                courtId, clientId,
                startTime: `${form.date}T${slot.startTime}:00`,
                endTime: `${form.date}T${resolvedEnd}:00`,
                notes: form.notes || null,
                coachId: bookingType === "class" ? (selectedCoachId || null) : null,
              }),
            })
          )
        }
      }

      const results = await Promise.all(promises)
      const ok = results.filter(r => r.ok).length
      const failed = results.length - ok

      if (ok > 0 && useCredit && clientId && selectedClient?.creditBalance && selectedClient.creditBalance > 0) {
        const deduct = Math.min(selectedClient.creditBalance, totalPrice)
        await fetch(`/api/businesses/${businessId}/clients/${clientId}/credit`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: deduct }),
        })
      }

      if (ok === results.length) {
        const label = bookingType === "class" ? `Clase particular creada` : `${ok} reserva${ok !== 1 ? "s" : ""} creada${ok !== 1 ? "s" : ""}`
        toast.success(useCredit && ok > 0 ? `${label} — crédito aplicado` : label)
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

          {/* CANCHA — multi-select pills para "simple" */}
          {bookingType === "simple" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>
                  Cancha{selectedCourtIds.length > 1 ? `s (${selectedCourtIds.length})` : ""}
                </p>
                {activeCourts.length > 1 && (
                  <button type="button" onClick={selectAllCourts}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                    style={{ color: GOLD, background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.2)` }}>
                    Todas
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeCourts.map(court => {
                  const isSelected = selectedCourtIds.includes(court.id)
                  const unavailable = selectedDayOfWeek >= 0 && (court.pricingRules?.length ?? 0) > 0 &&
                    !court.pricingRules?.some(r => r.days.includes(selectedDayOfWeek))
                  return (
                    <button key={court.id} type="button"
                      onClick={() => !unavailable && toggleCourt(court.id)}
                      disabled={unavailable}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                      style={isSelected
                        ? { background: court.color, color: "#fff", border: `2px solid ${court.color}` }
                        : { background: "rgba(13,27,42,0.04)", color: NAVY, border: "1.5px solid rgba(13,27,42,0.12)" }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isSelected ? "rgba(255,255,255,0.6)" : court.color }} />
                      {court.name}
                      {isSelected && <X className="w-3 h-3 ml-0.5 opacity-70" />}
                    </button>
                  )
                })}
              </div>
              {selectedCourtIds.length === 0 && (
                <p className="text-[10px] mt-1" style={{ color: "rgba(201,168,76,0.7)" }}>Selecciona al menos una cancha</p>
              )}
            </div>
          )}

          {/* CANCHA — dropdown para "recurring" */}
          {bookingType === "recurring" && (
            <div>
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Cancha</p>
              <div className="relative">
                <select value={recurringCourtId} onChange={e => setRecurringCourtId(e.target.value)}
                  className={inputCls + " appearance-none pr-9"} style={inputStyle}>
                  <option value="" disabled>Seleccionar cancha</option>
                  {activeCourts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.sport ? ` (${c.sport})` : ""}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: GOLD }} />
              </div>
            </div>
          )}

          {/* Entrenador + Cancha — solo clase particular */}
          {bookingType === "class" && (
            <>
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
                <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Cancha</p>
                <div className="relative">
                  <select value={classCourtId} onChange={e => setClassCourtId(e.target.value)}
                    className={inputCls + " appearance-none pr-9"} style={inputStyle}>
                    <option value="" disabled>Seleccionar cancha</option>
                    {activeCourts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.sport ? ` (${c.sport})` : ""}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: GOLD }} />
                </div>
              </div>
            </>
          )}

          {/* Cliente */}
          <ClientCombobox clients={clients} value={selectedClient} onSelect={setSelectedClient} />

          {/* Fecha */}
          <div>
            <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>
              {bookingType === "recurring" || (bookingType === "class" && classRecurring) ? "Fecha de inicio" : "Fecha"}
            </p>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
          </div>

          {/* Horario — fixed slots o libre */}
          {primaryFixedSlots.length > 0 && bookingType === "simple" ? (
            <div>
              <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Horario — elige un bloque</p>
              <div className="grid grid-cols-3 gap-1.5">
                {primaryFixedSlots.map(slot => {
                  const end = getSlotEnd(primaryCourtId, slot)
                  const isSelected = timeSlots.some(s => s.startTime === slot)
                  return (
                    <button key={slot} type="button"
                      onClick={() => {
                        setTimeSlots(prev => {
                          if (prev.some(s => s.startTime === slot)) {
                            const next = prev.filter(s => s.startTime !== slot)
                            return next.length === 0 ? [{ id: "1", startTime: slot, endTime: end }] : next
                          }
                          return [...prev, { id: String(Date.now()), startTime: slot, endTime: end }]
                        })
                      }}
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
              {timeSlots.length > 1 && (
                <p className="text-[10px] mt-1.5 font-semibold" style={{ color: GOLD }}>
                  {timeSlots.length} bloques seleccionados
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Quick duration — solo para primer slot / no multi */}
              {timeSlots.length === 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "rgba(13,27,42,0.4)" }}>Duración</span>
                  {[60, 90, 120].map(mins => {
                    const [sh, sm] = timeSlots[0].startTime.split(":").map(Number)
                    const totalMins = sh * 60 + sm + mins
                    const calcEnd = `${String(Math.floor(totalMins / 60)).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}`
                    const isActive = timeSlots[0].endTime === calcEnd
                    return (
                      <button key={mins} type="button"
                        onClick={() => updateSlot(timeSlots[0].id, "endTime", calcEnd)}
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
              )}

              {/* Slot rows */}
              <div className="space-y-2">
                {timeSlots.map((slot, idx) => (
                  <div key={slot.id} className="rounded-xl p-2.5 space-y-2"
                    style={{ background: idx === 0 ? "transparent" : "rgba(13,27,42,0.03)", border: idx === 0 ? "none" : "1px solid rgba(13,27,42,0.08)" }}>
                    {idx > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(13,27,42,0.4)" }}>
                          Horario {idx + 1}
                        </span>
                        <button type="button" onClick={() => removeSlot(slot.id)}
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ color: "rgba(201,68,68,0.6)", background: "rgba(201,68,68,0.06)" }}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <TimeSelect label={idx === 0 ? "Inicio" : "Inicio"} value={slot.startTime}
                        onChange={v => updateSlot(slot.id, "startTime", v)} />
                      <TimeSelect label={idx === 0 ? "Fin" : "Fin"} value={slot.endTime}
                        onChange={v => updateSlot(slot.id, "endTime", v)} minTime={slot.startTime} />
                    </div>
                    {slotPrice(slot) > 0 && (
                      <p className="text-[10px] text-right font-bold" style={{ color: GOLD }}>
                        ${slotPrice(slot).toLocaleString("es-CL")}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* + Agregar horario — solo en modo simple */}
              {bookingType === "simple" && (
                <button type="button" onClick={addSlot}
                  className="w-full h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
                  style={{ border: `1.5px dashed rgba(201,168,76,0.4)`, color: GOLD, background: "rgba(201,168,76,0.03)" }}>
                  <Plus className="w-3.5 h-3.5" />
                  Agregar horario
                </button>
              )}
            </div>
          )}

          {/* Panel recurrencia — tipo "recurring" */}
          {bookingType === "recurring" && (
            <div className="rounded-xl p-3.5 space-y-3" style={{ border: `1px solid rgba(201,168,76,0.25)`, background: "rgba(201,168,76,0.04)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: GOLD }}>Repeticiones</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>Repite cada</span>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ background: "rgba(201,168,76,0.15)", color: "#8a6520" }}>
                  {selectedDayOfWeek >= 0 ? DAYS_ES[selectedDayOfWeek] : "—"}
                </span>
                <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>a las {timeSlots[0].startTime}</span>
              </div>
              {/* Day of week display (read-only, derived from date) */}
              <div className="flex gap-1">
                {DAYS_SHORT.map((d, i) => (
                  <div key={d}
                    className="flex-1 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold"
                    style={i === selectedDayOfWeek
                      ? { background: GOLD, color: "#fff" }
                      : { background: "rgba(13,27,42,0.06)", color: "rgba(13,27,42,0.3)" }}>
                    {d}
                  </div>
                ))}
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
                Los feriados de tipo "Cerrado" se omiten automáticamente.
              </p>
            </div>
          )}

          {/* Toggle recurrencia — solo clase particular */}
          {bookingType === "class" && (
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
                <p className="text-[10px]" style={{ color: "rgba(13,27,42,0.4)" }}>El alumno viene todos los {selectedDayOfWeek >= 0 ? DAYS_ES[selectedDayOfWeek].toLowerCase() + "s" : "…"}</p>
              </div>
            </button>
          )}

          {/* Panel recurrencia clase */}
          {bookingType === "class" && classRecurring && (
            <div className="rounded-xl p-3.5 space-y-3" style={{ border: `1px solid rgba(201,168,76,0.25)`, background: "rgba(201,168,76,0.04)" }}>
              <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: GOLD }}>Repeticiones de clase</p>
              <div className="flex gap-1">
                {DAYS_SHORT.map((d, i) => (
                  <div key={d}
                    className="flex-1 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold"
                    style={i === selectedDayOfWeek
                      ? { background: GOLD, color: "#fff" }
                      : { background: "rgba(13,27,42,0.06)", color: "rgba(13,27,42,0.3)" }}>
                    {d}
                  </div>
                ))}
              </div>
              <div>
                <p className={labelCls} style={{ color: "rgba(13,27,42,0.4)" }}>Fecha de término</p>
                <input type="date" value={classRangeEnd} onChange={e => setClassRangeEnd(e.target.value)}
                  min={form.date}
                  className={inputCls} style={{ ...inputStyle, colorScheme: "light" } as React.CSSProperties} />
              </div>
              {sessionCount > 0 && (
                <div className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                  style={{ background: "rgba(201,168,76,0.1)", color: "#8a6520" }}>
                  <span>Se crearán</span>
                  <span className="font-black">{sessionCount} clases</span>
                </div>
              )}
            </div>
          )}

          {/* Precio estimado + crédito */}
          {bookingType !== "recurring" && totalPrice > 0 && (
            <div className="space-y-2">
              <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
                style={{ background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)` }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.5)" }}>Precio estimado</p>
                  {(selectedCourtIds.length > 1 || timeSlots.length > 1) && bookingType === "simple" && (
                    <p className="text-[10px]" style={{ color: "rgba(13,27,42,0.35)" }}>
                      {selectedCourtIds.length} cancha{selectedCourtIds.length !== 1 ? "s" : ""} × {timeSlots.length} horario{timeSlots.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <p className="text-sm font-black" style={{ color: GOLD }}>${totalPrice.toLocaleString("es-CL")}</p>
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
                      −${Math.min(selectedClient.creditBalance, totalPrice).toLocaleString("es-CL")}
                    </p>
                  )}
                </button>
              ) : null}
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
            {saving ? "Guardando…"
              : bookingType === "recurring" ? "Crear reservas recurrentes"
              : bookingType === "class" && classRecurring ? "Crear clases recurrentes"
              : bookingType === "class" ? "Crear clase particular"
              : selectedCourtIds.length > 1 || timeSlots.length > 1
              ? `Crear ${selectedCourtIds.length * timeSlots.length} reserva${selectedCourtIds.length * timeSlots.length !== 1 ? "s" : ""}`
              : "Confirmar reserva"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
