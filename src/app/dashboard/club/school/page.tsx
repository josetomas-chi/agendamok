"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useBusiness } from "@/contexts/business-context"
import { toast } from "sonner"
import { Plus, X, ChevronLeft, ChevronRight, Users, BookOpen, CreditCard, Pencil, Trash2, UserPlus, UserMinus } from "lucide-react"
import { format, addDays, subDays, parseISO } from "date-fns"
import { es } from "date-fns/locale"

const DAY_LABELS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"]
const DAY_LABELS_SHORT = ["D", "L", "M", "M", "J", "V", "S"]
const LEVELS = ["Iniciación", "Intermedio", "Avanzado", "Competición"]
const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"
const BORDER = "1px solid rgba(13,27,42,0.1)"

function fmt(n: number) { return `$${Number(n).toLocaleString("es-CL")}` }

type Coach = { id: string; name: string; color: string }
type Client = { id: string; name: string; email: string | null; phone: string | null; rut: string | null }
type Enrollment = { id: string; clientId: string; status: string; startDate: string; notes: string | null; client: Client }
type Group = {
  id: string; name: string; sport: string | null; level: string | null
  days: number[]; startTime: string; endTime: string
  coachId: string | null; coach: Coach | null
  maxCapacity: number; monthlyPrice: number; color: string
  isActive: boolean; startDate: string | null; endDate: string | null; notes: string | null
  enrollments: Enrollment[]
  _count: { enrollments: number }
}
type AttendanceRecord = { clientId: string; present: boolean; client: { id: string; name: string } }
type SchoolClass = {
  id: string; groupId: string; date: string
  group: { id: string; name: string; color: string; maxCapacity: number }
  coach: { id: string; name: string } | null
  attendance: AttendanceRecord[]
}

// ─── Group Form ───────────────────────────────────────────────────────────────
function GroupForm({ initial, coaches, onSave, onCancel }: {
  initial?: Partial<Group>
  coaches: Coach[]
  onSave: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [sport, setSport] = useState(initial?.sport ?? "")
  const [level, setLevel] = useState(initial?.level ?? "")
  const [days, setDays] = useState<number[]>(initial?.days ?? [])
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00")
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00")
  const [coachId, setCoachId] = useState(initial?.coachId ?? "")
  const [maxCapacity, setMaxCapacity] = useState(String(initial?.maxCapacity ?? 10))
  const [monthlyPrice, setMonthlyPrice] = useState(String(initial?.monthlyPrice ?? 0))
  const [color, setColor] = useState(initial?.color ?? "#38bdf8")
  const [startDate, setStartDate] = useState(initial?.startDate ? initial.startDate.slice(0, 10) : "")
  const [endDate, setEndDate] = useState(initial?.endDate ? initial.endDate.slice(0, 10) : "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [saving, setSaving] = useState(false)

  const toggleDay = (d: number) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  // Calcular cantidad de sesiones en el período
  const sessionCount = React.useMemo(() => {
    if (!startDate || !endDate || days.length === 0) return null
    const start = new Date(startDate + "T00:00:00")
    const end = new Date(endDate + "T00:00:00")
    if (end < start) return null
    let count = 0
    const cur = new Date(start)
    while (cur <= end) {
      if (days.includes(cur.getDay())) count++
      cur.setDate(cur.getDate() + 1)
    }
    return count
  }, [startDate, endDate, days])

  async function handleSubmit() {
    if (!name.trim() || !startTime || !endTime) return toast.error("Nombre y horario son obligatorios")
    setSaving(true)
    await onSave({ name, sport: sport || null, level: level || null, days, startTime, endTime, coachId: coachId || null, maxCapacity: parseInt(maxCapacity), monthlyPrice: parseFloat(monthlyPrice) || 0, color, startDate: startDate || null, endDate: endDate || null, notes: notes || null })
    setSaving(false)
  }

  const inputClass = "w-full rounded-xl px-3 py-2.5 text-sm outline-none"
  const inputStyle = { background: "#f5f4f0", border: BORDER, color: NAVY }
  const labelStyle = { color: "rgba(13,27,42,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label style={labelStyle}>Nombre del grupo *</label>
          <input className={inputClass} style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Sub-12 Pádel" />
        </div>
        <div>
          <label style={labelStyle}>Deporte</label>
          <input className={inputClass} style={inputStyle} value={sport} onChange={e => setSport(e.target.value)} placeholder="Pádel, Tenis…" />
        </div>
        <div>
          <label style={labelStyle}>Nivel</label>
          <select className={inputClass} style={inputStyle} value={level} onChange={e => setLevel(e.target.value)}>
            <option value="">Sin nivel</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Hora inicio</label>
          <input type="time" className={inputClass} style={inputStyle} value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Hora fin</label>
          <input type="time" className={inputClass} style={inputStyle} value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label style={labelStyle}>Días de clase</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map((d, i) => (
              <button key={i} type="button" onClick={() => toggleDay(i)}
                className="w-9 h-9 rounded-lg text-xs font-bold transition-all"
                style={days.includes(i)
                  ? { background: "#0d1b2a", color: "#fff", border: "1px solid #0d1b2a" }
                  : { background: "#f5f4f0", color: "rgba(13,27,42,0.5)", border: BORDER }}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Entrenador</label>
          <select className={inputClass} style={inputStyle} value={coachId} onChange={e => setCoachId(e.target.value)}>
            <option value="">Sin asignar</option>
            {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Cupos máx.</label>
          <input type="number" className={inputClass} style={inputStyle} value={maxCapacity} onChange={e => setMaxCapacity(e.target.value)} min={1} />
        </div>
        <div>
          <label style={labelStyle}>Precio mensual (CLP)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: "rgba(13,27,42,0.4)" }}>$</span>
            <input type="number" className={inputClass} style={{ ...inputStyle, paddingLeft: "1.5rem" }} value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} min={0} step={1000} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-full h-10 rounded-xl cursor-pointer" style={{ border: BORDER, padding: 2 }} />
        </div>
        <div>
          <label style={labelStyle}>Fecha inicio</label>
          <input type="date" className={inputClass} style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Fecha término</label>
          <input type="date" className={inputClass} style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {sessionCount !== null && (
          <div className="col-span-2 rounded-xl px-4 py-3 flex items-center gap-2"
            style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.3)" }}>
            <span className="text-lg font-black" style={{ color: "#0ea5e9" }}>{sessionCount}</span>
            <span className="text-sm font-medium" style={{ color: "rgba(13,27,42,0.6)" }}>
              sesiones en el período · {days.length > 0 && `${DAY_LABELS.filter((_,i) => days.includes(i)).join(", ")}`}
            </span>
          </div>
        )}
        <div className="col-span-2">
          <label style={labelStyle}>Notas</label>
          <textarea className={inputClass} style={{ ...inputStyle, resize: "none" }} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones…" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 h-10 rounded-xl text-sm font-bold uppercase tracking-wide disabled:opacity-50"
          style={{ background: NAVY, color: "#fff" }}>
          {saving ? "Guardando…" : initial?.id ? "Guardar cambios" : "Crear grupo"}
        </button>
        <button onClick={onCancel} className="px-4 h-10 rounded-xl text-sm font-medium" style={{ background: "#f5f4f0", color: "rgba(13,27,42,0.5)" }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────
function AttendanceTab({ businessId, groups }: { businessId: string; groups: Group[] }) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})

  const loadClass = useCallback(async (groupId: string, date: Date) => {
    setLoading(true)
    const dateStr = format(date, "yyyy-MM-dd")
    const r = await fetch(`/api/businesses/${businessId}/school/classes?groupId=${groupId}&date=${dateStr}`)
    const d = await r.json()
    const cls: SchoolClass | null = d.classes?.[0] ?? null
    setSchoolClass(cls)
    if (cls) {
      const map: Record<string, boolean> = {}
      cls.attendance.forEach(a => { map[a.clientId] = a.present })
      setAttendance(map)
    } else {
      setAttendance({})
    }
    setLoading(false)
  }, [businessId])

  useEffect(() => {
    if (selectedGroup) loadClass(selectedGroup.id, selectedDate)
  }, [selectedGroup, selectedDate, loadClass])

  async function createAndLoad() {
    if (!selectedGroup) return
    setSaving(true)
    await fetch(`/api/businesses/${businessId}/school/classes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: selectedGroup.id, date: format(selectedDate, "yyyy-MM-dd"), coachId: selectedGroup.coachId }),
    })
    await loadClass(selectedGroup.id, selectedDate)
    setSaving(false)
  }

  async function saveAttendance() {
    if (!schoolClass) return
    setSaving(true)
    const records = Object.entries(attendance).map(([clientId, present]) => ({ clientId, present }))
    await fetch(`/api/businesses/${businessId}/school/classes/${schoolClass.id}/attendance`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    })
    toast.success("Asistencia guardada")
    setSaving(false)
  }

  const activeEnrollments = selectedGroup?.enrollments.filter(e => e.status === "ACTIVE") ?? []

  return (
    <div className="space-y-4">
      {/* Group selector */}
      <div className="flex flex-wrap gap-2">
        {groups.filter(g => g.isActive).map(g => (
          <button key={g.id} onClick={() => { setSelectedGroup(g); setSchoolClass(null) }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={selectedGroup?.id === g.id
              ? { background: g.color, color: "#fff", border: `1px solid ${g.color}` }
              : { background: "rgba(13,27,42,0.04)", color: "rgba(13,27,42,0.6)", border: BORDER }}>
            {g.name}
          </button>
        ))}
      </div>

      {selectedGroup && (
        <>
          {/* Date nav */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedDate(d => subDays(d, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: BORDER }}>
              <ChevronLeft className="w-4 h-4" style={{ color: "rgba(13,27,42,0.4)" }} />
            </button>
            <span className="text-sm font-bold capitalize flex-1 text-center" style={{ color: NAVY }}>
              {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </span>
            <button onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: BORDER }}>
              <ChevronRight className="w-4 h-4" style={{ color: "rgba(13,27,42,0.4)" }} />
            </button>
          </div>

          {loading && <p className="text-center text-sm py-6" style={{ color: "rgba(13,27,42,0.4)" }}>Cargando…</p>}

          {!loading && !schoolClass && (
            <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(13,27,42,0.03)", border: BORDER }}>
              <p className="text-sm mb-3" style={{ color: "rgba(13,27,42,0.5)" }}>No hay clase registrada para este día</p>
              <button onClick={createAndLoad} disabled={saving}
                className="px-4 h-9 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: NAVY, color: "#fff" }}>
                {saving ? "Creando…" : "Crear clase y tomar asistencia"}
              </button>
            </div>
          )}

          {!loading && schoolClass && (
            <div className="rounded-2xl overflow-hidden" style={{ border: BORDER }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(13,27,42,0.03)", borderBottom: BORDER }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.5)" }}>
                  Asistencia — {activeEnrollments.length} alumnos
                </p>
                <button onClick={saveAttendance} disabled={saving}
                  className="px-3 h-7 rounded-lg text-xs font-bold disabled:opacity-40"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", color: "#15803d" }}>
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
              {activeEnrollments.length === 0 && (
                <p className="p-6 text-sm text-center" style={{ color: "rgba(13,27,42,0.4)" }}>Sin alumnos inscritos en este grupo</p>
              )}
              {activeEnrollments.map((e, i) => {
                const present = attendance[e.clientId] ?? true
                return (
                  <div key={e.clientId} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? BORDER : undefined, background: i % 2 === 0 ? "#fff" : "rgba(13,27,42,0.015)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{e.client.name}</p>
                      {e.client.rut && <p className="text-xs" style={{ color: "rgba(13,27,42,0.4)" }}>{e.client.rut}</p>}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setAttendance(prev => ({ ...prev, [e.clientId]: true }))}
                        className="h-7 px-3 rounded-lg text-xs font-bold transition-all"
                        style={present
                          ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#15803d" }
                          : { background: "transparent", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.3)" }}>
                        ✓ Presente
                      </button>
                      <button onClick={() => setAttendance(prev => ({ ...prev, [e.clientId]: false }))}
                        className="h-7 px-3 rounded-lg text-xs font-bold transition-all"
                        style={!present
                          ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#dc2626" }
                          : { background: "transparent", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.3)" }}>
                        ✗ Ausente
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      {!selectedGroup && groups.length > 0 && (
        <p className="text-center text-sm py-8" style={{ color: "rgba(13,27,42,0.4)" }}>Selecciona un grupo para registrar asistencia</p>
      )}
    </div>
  )
}

// ─── Billing Tab ─────────────────────────────────────────────────────────────
function BillingTab({ groups }: { groups: Group[] }) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [paid, setPaid] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (selectedGroup) setPaid({})
  }, [selectedGroup])

  const activeEnrollments = selectedGroup?.enrollments.filter(e => e.status === "ACTIVE") ?? []
  const total = activeEnrollments.length * (selectedGroup?.monthlyPrice ?? 0)
  const totalPaid = activeEnrollments.filter(e => paid[e.clientId]).length * (selectedGroup?.monthlyPrice ?? 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {groups.filter(g => g.isActive).map(g => (
          <button key={g.id} onClick={() => setSelectedGroup(g)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={selectedGroup?.id === g.id
              ? { background: g.color, color: "#fff", border: `1px solid ${g.color}` }
              : { background: "rgba(13,27,42,0.04)", color: "rgba(13,27,42,0.6)", border: BORDER }}>
            {g.name}
          </button>
        ))}
      </div>

      {selectedGroup && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: "rgba(13,27,42,0.04)", border: BORDER }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>Alumnos</p>
              <p className="text-xl font-black" style={{ color: NAVY }}>{activeEnrollments.length}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>Cobrado</p>
              <p className="text-xl font-black" style={{ color: "#15803d" }}>{fmt(totalPaid)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.45)" }}>Pendiente</p>
              <p className="text-xl font-black" style={{ color: GOLD }}>{fmt(total - totalPaid)}</p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: BORDER }}>
            <div className="px-4 py-3" style={{ background: "rgba(13,27,42,0.03)", borderBottom: BORDER }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.5)" }}>
                {fmt(selectedGroup.monthlyPrice)}/mes por alumno
              </p>
            </div>
            {activeEnrollments.length === 0 && (
              <p className="p-6 text-sm text-center" style={{ color: "rgba(13,27,42,0.4)" }}>Sin alumnos inscritos</p>
            )}
            {activeEnrollments.map((e, i) => (
              <div key={e.clientId} className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i > 0 ? BORDER : undefined, background: i % 2 === 0 ? "#fff" : "rgba(13,27,42,0.015)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{e.client.name}</p>
                  <p className="text-xs" style={{ color: "rgba(13,27,42,0.4)" }}>
                    {e.client.phone ?? e.client.email ?? ""}
                  </p>
                </div>
                <p className="text-sm font-bold mr-2" style={{ color: NAVY }}>{fmt(selectedGroup.monthlyPrice)}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setPaid(p => ({ ...p, [e.clientId]: true }))}
                    className="h-7 px-3 rounded-lg text-xs font-bold transition-all"
                    style={paid[e.clientId]
                      ? { background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#15803d" }
                      : { background: "transparent", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.3)" }}>
                    ✓ Pagado
                  </button>
                  <button onClick={() => setPaid(p => ({ ...p, [e.clientId]: false }))}
                    className="h-7 px-3 rounded-lg text-xs font-bold transition-all"
                    style={paid[e.clientId] === false
                      ? { background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#92400e" }
                      : { background: "transparent", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.3)" }}>
                    Pendiente
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {!selectedGroup && (
        <p className="text-center text-sm py-8" style={{ color: "rgba(13,27,42,0.4)" }}>Selecciona un grupo para ver la facturación</p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SchoolPage() {
  const { businessId } = useBusiness()
  const [tab, setTab] = useState<"grupos" | "asistencia" | "facturacion">("grupos")
  const [groups, setGroups] = useState<Group[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollClientId, setEnrollClientId] = useState("")

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const [gr, co, cl] = await Promise.all([
      fetch(`/api/businesses/${businessId}/school/groups`).then(r => r.json()),
      fetch(`/api/businesses/${businessId}/club-coaches`).then(r => r.json()),
      fetch(`/api/businesses/${businessId}/clients`).then(r => r.json()),
    ])
    setGroups(gr.groups ?? [])
    setCoaches(co.coaches ?? [])
    setClients(cl.clients ?? [])
    setLoading(false)
  }, [businessId])

  useEffect(() => { load() }, [load])

  async function handleCreateGroup(data: Record<string, unknown>) {
    const r = await fetch(`/api/businesses/${businessId}/school/groups`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (r.ok) { toast.success("Grupo creado"); setShowForm(false); load() }
    else toast.error("Error al crear grupo")
  }

  async function handleEditGroup(data: Record<string, unknown>) {
    if (!editGroup) return
    const r = await fetch(`/api/businesses/${businessId}/school/groups/${editGroup.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    if (r.ok) { toast.success("Grupo actualizado"); setEditGroup(null); load() }
    else toast.error("Error al actualizar")
  }

  async function handleDeleteGroup(g: Group) {
    if (!confirm(`¿Eliminar el grupo "${g.name}"? Se perderán las inscripciones y clases.`)) return
    const r = await fetch(`/api/businesses/${businessId}/school/groups/${g.id}`, { method: "DELETE" })
    if (r.ok) { toast.success("Grupo eliminado"); setSelectedGroup(null); load() }
    else toast.error("Error al eliminar")
  }

  async function handleEnroll() {
    if (!selectedGroup || !enrollClientId) return
    setEnrolling(true)
    const r = await fetch(`/api/businesses/${businessId}/school/groups/${selectedGroup.id}/enrollments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: enrollClientId }),
    })
    const d = await r.json()
    setEnrolling(false)
    if (r.ok) { toast.success("Alumno inscrito"); setEnrollClientId(""); load().then(() => {
      setGroups(prev => {
        const updated = prev.find(g => g.id === selectedGroup.id)
        if (updated) setSelectedGroup(updated)
        return prev
      })
    })} else toast.error(d.error ?? "Error al inscribir")
  }

  async function handleUnenroll(enrollmentId: string, clientName: string) {
    if (!selectedGroup) return
    if (!confirm(`¿Dar de baja a ${clientName}?`)) return
    const r = await fetch(`/api/businesses/${businessId}/school/groups/${selectedGroup.id}/enrollments/${enrollmentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "CANCELLED" }),
    })
    if (r.ok) { toast.success("Alumno dado de baja"); load() }
    else toast.error("Error")
  }

  // sync selectedGroup with refreshed data
  useEffect(() => {
    if (selectedGroup) {
      const updated = groups.find(g => g.id === selectedGroup.id)
      if (updated) setSelectedGroup(updated)
    }
  }, [groups])

  const activeGroups = groups.filter(g => g.isActive)
  const inactiveGroups = groups.filter(g => !g.isActive)

  const TABS = [
    { key: "grupos", label: "Grupos", icon: Users },
    { key: "asistencia", label: "Asistencia", icon: BookOpen },
    { key: "facturacion", label: "Facturación", icon: CreditCard },
  ] as const

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Escuela Deportiva</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>
            {activeGroups.length} grupo{activeGroups.length !== 1 ? "s" : ""} activo{activeGroups.length !== 1 ? "s" : ""} · {groups.reduce((s, g) => s + g._count.enrollments, 0)} alumnos
          </p>
        </div>
        {tab === "grupos" && !showForm && !editGroup && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-bold"
            style={{ background: NAVY, color: "#fff" }}>
            <Plus className="w-4 h-4" /> Nuevo grupo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(13,27,42,0.05)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setShowForm(false); setEditGroup(null) }}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-bold transition-all"
            style={tab === t.key
              ? { background: "#fff", color: NAVY, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
              : { color: "rgba(13,27,42,0.45)" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-center text-sm py-12" style={{ color: "rgba(13,27,42,0.4)" }}>Cargando…</p>
      ) : (
        <>
          {/* ── GRUPOS TAB ── */}
          {tab === "grupos" && (
            <div className="space-y-4">
              {(showForm || editGroup) && (
                <div className="rounded-2xl p-5" style={{ background: "#fff", border: BORDER, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <p className="text-sm font-black uppercase tracking-wide mb-4" style={{ color: NAVY }}>
                    {editGroup ? "Editar grupo" : "Nuevo grupo"}
                  </p>
                  <GroupForm
                    initial={editGroup ?? undefined}
                    coaches={coaches}
                    onSave={editGroup ? handleEditGroup : handleCreateGroup}
                    onCancel={() => { setShowForm(false); setEditGroup(null) }}
                  />
                </div>
              )}

              {!showForm && !editGroup && selectedGroup && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: `2px solid ${selectedGroup.color}`, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  {/* Group header */}
                  <div className="px-5 py-4 flex items-center justify-between" style={{ background: `${selectedGroup.color}15`, borderBottom: BORDER }}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: selectedGroup.color }} />
                      <div>
                        <p className="text-sm font-black" style={{ color: NAVY }}>{selectedGroup.name}</p>
                        <p className="text-xs" style={{ color: "rgba(13,27,42,0.5)" }}>
                          {[selectedGroup.sport, selectedGroup.level].filter(Boolean).join(" · ")}
                          {selectedGroup.days.length > 0 && ` · ${selectedGroup.days.map(d => DAY_LABELS_SHORT[d]).join(" ")}`}
                          {selectedGroup.startTime && ` · ${selectedGroup.startTime}–${selectedGroup.endTime}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditGroup(selectedGroup)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5" style={{ border: BORDER }}>
                        <Pencil className="w-3.5 h-3.5" style={{ color: "rgba(13,27,42,0.5)" }} />
                      </button>
                      <button onClick={() => handleDeleteGroup(selectedGroup)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50" style={{ border: BORDER }}>
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                      </button>
                      <button onClick={() => setSelectedGroup(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5">
                        <X className="w-4 h-4" style={{ color: "rgba(13,27,42,0.4)" }} />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 divide-x" style={{ borderBottom: BORDER }}>
                    {[
                      { label: "Alumnos", value: `${selectedGroup._count.enrollments}/${selectedGroup.maxCapacity}` },
                      { label: "Precio/mes", value: fmt(selectedGroup.monthlyPrice) },
                      { label: "Entrenador", value: selectedGroup.coach?.name ?? "Sin asignar" },
                    ].map(s => (
                      <div key={s.label} className="px-4 py-3 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.4)" }}>{s.label}</p>
                        <p className="text-sm font-black mt-0.5 truncate" style={{ color: NAVY }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Enroll */}
                  <div className="px-4 py-3 flex gap-2" style={{ borderBottom: BORDER }}>
                    <select value={enrollClientId} onChange={e => setEnrollClientId(e.target.value)}
                      className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                      style={{ background: "#f5f4f0", border: BORDER, color: NAVY }}>
                      <option value="">Seleccionar alumno a inscribir…</option>
                      {clients
                        .filter(c => !selectedGroup.enrollments.find(e => e.clientId === c.id && e.status === "ACTIVE"))
                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={handleEnroll} disabled={enrolling || !enrollClientId}
                      className="px-3 h-9 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: NAVY, color: "#fff" }}>
                      <UserPlus className="w-4 h-4" />
                      {enrolling ? "…" : "Inscribir"}
                    </button>
                  </div>

                  {/* Students list */}
                  {selectedGroup.enrollments.filter(e => e.status === "ACTIVE").length === 0 && (
                    <p className="p-6 text-sm text-center" style={{ color: "rgba(13,27,42,0.4)" }}>Sin alumnos inscritos todavía</p>
                  )}
                  {selectedGroup.enrollments.filter(e => e.status === "ACTIVE").map((e, i, arr) => (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderTop: i > 0 ? BORDER : undefined, background: i % 2 === 0 ? "#fff" : "rgba(13,27,42,0.015)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{e.client.name}</p>
                        <p className="text-xs" style={{ color: "rgba(13,27,42,0.4)" }}>
                          {[e.client.rut, e.client.phone, e.client.email].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <button onClick={() => handleUnenroll(e.id, e.client.name)}
                        className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-[11px] font-bold"
                        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>
                        <UserMinus className="w-3 h-3" /> Dar de baja
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Groups list */}
              {!showForm && !editGroup && !selectedGroup && (
                <>
                  {groups.length === 0 && (
                    <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(13,27,42,0.03)", border: BORDER }}>
                      <p className="text-sm font-bold mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>Sin grupos creados</p>
                      <p className="text-xs" style={{ color: "rgba(13,27,42,0.35)" }}>Crea tu primer grupo de escuela deportiva</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {groups.map(g => (
                      <button key={g.id} onClick={() => setSelectedGroup(g)} className="text-left rounded-2xl p-4 transition-all hover:shadow-md"
                        style={{ background: "#fff", border: `1.5px solid ${g.isActive ? g.color + "60" : "rgba(13,27,42,0.08)"}`, opacity: g.isActive ? 1 : 0.6 }}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: `${g.color}25`, border: `1.5px solid ${g.color}50` }}>
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full" style={{ background: g.color }} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate" style={{ color: NAVY }}>{g.name}</p>
                            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(13,27,42,0.5)" }}>
                              {[g.sport, g.level].filter(Boolean).join(" · ")}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs font-bold" style={{ color: "rgba(13,27,42,0.6)" }}>
                                👥 {g._count.enrollments}/{g.maxCapacity}
                              </span>
                              {g.days.length > 0 && (
                                <span className="text-xs font-bold" style={{ color: "rgba(13,27,42,0.6)" }}>
                                  {g.days.map(d => DAY_LABELS[d]).join(" · ")} {g.startTime}–{g.endTime}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black" style={{ color: g.color }}>{fmt(g.monthlyPrice)}</p>
                            <p className="text-[10px]" style={{ color: "rgba(13,27,42,0.4)" }}>/mes</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {inactiveGroups.length > 0 && (
                    <p className="text-xs text-center" style={{ color: "rgba(13,27,42,0.35)" }}>
                      {inactiveGroups.length} grupo{inactiveGroups.length !== 1 ? "s" : ""} inactivo{inactiveGroups.length !== 1 ? "s" : ""} oculto{inactiveGroups.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "asistencia" && <AttendanceTab businessId={businessId} groups={activeGroups} />}
          {tab === "facturacion" && <BillingTab groups={activeGroups} />}
        </>
      )}
    </div>
  )
}
