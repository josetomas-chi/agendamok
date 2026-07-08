"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useBusiness } from "@/contexts/business-context"
import { Settings, CalendarX2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

const NAVY = "#0d1b2a"
const GOLD = "#C9A84C"
const BORDER = "rgba(201,168,76,0.2)"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

const SLOT_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1:30 h" },
  { value: 120, label: "2 horas" },
]

const TIME_SLOTS: string[] = []
for (let h = 0; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`)
}

type ClubForm = { clubName: string; description: string; address: string; phone: string; website: string; openDays: number[]; openTime: string; closeTime: string; slotMinutes: number }
type Holiday = { id: string; date: string; name: string; type: string; surchargeType: string | null; surchargeValue: number | null }
const EMPTY_HOLIDAY = { date: "", name: "", type: "CLOSED", surchargeType: "PERCENT", surchargeValue: "" }
const DEFAULTS: ClubForm = { clubName: "", description: "", address: "", phone: "", website: "", openDays: [1,2,3,4,5,6], openTime: "08:00", closeTime: "22:00", slotMinutes: 60 }

function Input({ value, onChange, placeholder, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full h-10 rounded-lg px-3 text-sm outline-none ${className}`}
      style={{ background: "rgba(201,168,76,0.06)", border: BORDER, color: NAVY }} />
  )
}

export default function ClubSettingsPage() {
  const { businessId } = useBusiness()
  const [form, setForm] = useState<ClubForm>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [showHolidayForm, setShowHolidayForm] = useState(false)
  const [holidayForm, setHolidayForm] = useState({ ...EMPTY_HOLIDAY })
  const [savingHoliday, setSavingHoliday] = useState(false)

  const load = useCallback(async (bid: string) => {
    try {
      const r = await fetch(`/api/businesses/${bid}/club-settings`)
      const d = await r.json()
      if (d.settings) setForm({ clubName: d.settings.clubName || "", description: d.settings.description || "", address: d.settings.address || "", phone: d.settings.phone || "", website: d.settings.website || "", openDays: d.settings.openDays ?? [1,2,3,4,5,6], openTime: d.settings.openTime || "08:00", closeTime: d.settings.closeTime || "22:00", slotMinutes: d.settings.slotMinutes || 60 })
    } finally { setLoading(false) }
  }, [])

  const loadHolidays = useCallback(async (bid: string) => {
    const r = await fetch(`/api/businesses/${bid}/club-holidays`)
    if (r.ok) { const d = await r.json(); setHolidays(d.holidays || []) }
  }, [])

  useEffect(() => {
    if (!businessId) return
    load(businessId); loadHolidays(businessId)
  }, [businessId, load, loadHolidays])

  async function handleSave() {
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/club-settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) toast.success("Configuración guardada"); else toast.error("Error al guardar")
    setSaving(false)
  }

  async function handleAddHoliday() {
    if (!holidayForm.date || !holidayForm.name) { toast.error("Completa fecha y nombre"); return }
    if (holidayForm.type === "SURCHARGE" && !holidayForm.surchargeValue) { toast.error("Ingresa el valor del recargo"); return }
    setSavingHoliday(true)
    const r = await fetch(`/api/businesses/${businessId}/club-holidays`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: holidayForm.date, name: holidayForm.name, type: holidayForm.type, surchargeType: holidayForm.type === "SURCHARGE" ? holidayForm.surchargeType : null, surchargeValue: holidayForm.type === "SURCHARGE" ? Number(holidayForm.surchargeValue) : null }) })
    if (r.ok) { toast.success("Feriado agregado"); setShowHolidayForm(false); setHolidayForm({ ...EMPTY_HOLIDAY }); loadHolidays(businessId) } else toast.error("Error al guardar")
    setSavingHoliday(false)
  }

  async function handleDeleteHoliday(id: string) {
    await fetch(`/api/businesses/${businessId}/club-holidays/${id}`, { method: "DELETE" })
    toast.success("Feriado eliminado"); loadHolidays(businessId)
  }

  if (loading) return <div className="py-20 text-center text-sm" style={{ color: "rgba(13,27,42,0.4)" }}>Cargando…</div>

  const card = { borderRadius: 16, border: BORDER, background: "rgba(13,27,42,0.04)", overflow: "hidden" as const }
  const cardHeader = { padding: "14px 20px", borderBottom: BORDER, display: "flex", alignItems: "center", justifyContent: "space-between" as const }
  const label = { fontSize: 11, fontWeight: 600, color: "rgba(13,27,42,0.45)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 6, display: "block" as const }
  const btnBase = "rounded-lg text-xs font-semibold transition-colors border px-3 py-2"

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.1)", border: BORDER }}>
          <Settings className="w-5 h-5" style={{ color: GOLD }} />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Configuración del club</h1>
          <p className="text-sm" style={{ color: "rgba(13,27,42,0.45)" }}>Información general, horarios y días feriados</p>
        </div>
      </div>

      {/* Info general */}
      <div style={card}>
        <div style={cardHeader}>
          <p className="text-sm font-bold" style={{ color: NAVY }}>Información general</p>
        </div>
        <div className="p-5 space-y-3">
          <div><span style={label}>Nombre del club</span><Input value={form.clubName} onChange={v => setForm(f => ({ ...f, clubName: v }))} placeholder="ej: Club Pádel Hyundai" /></div>
          <div>
            <span style={label}>Descripción</span>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descripción…" rows={3}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: "rgba(201,168,76,0.06)", border: BORDER, color: NAVY }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><span style={label}>Dirección</span><Input value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Av. Ejemplo 123" /></div>
            <div><span style={label}>Teléfono</span><Input value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+56 9 1234 5678" /></div>
          </div>
          <div><span style={label}>Sitio web</span><Input value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} placeholder="https://club.cl" /></div>
        </div>
      </div>

      {/* Horarios */}
      <div style={card}>
        <div style={cardHeader}>
          <p className="text-sm font-bold" style={{ color: NAVY }}>Horarios de atención</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <span style={label}>Días de apertura</span>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => (
                <button key={i} type="button" onClick={() => setForm(f => ({ ...f, openDays: f.openDays.includes(i) ? f.openDays.filter(x => x !== i) : [...f.openDays, i].sort() }))}
                  className="flex-1 h-9 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: form.openDays.includes(i) ? GOLD : "rgba(13,27,42,0.06)", color: form.openDays.includes(i) ? NAVY : "rgba(13,27,42,0.35)", border: form.openDays.includes(i) ? "none" : BORDER }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(["openTime", "closeTime"] as const).map((field, i) => (
              <div key={field}>
                <span style={label}>{i === 0 ? "Apertura" : "Cierre"}</span>
                <div className="relative">
                  <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full h-10 rounded-lg px-3 pr-8 text-sm outline-none appearance-none"
                    style={{ background: "rgba(201,168,76,0.06)", border: BORDER, color: NAVY }}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "rgba(13,27,42,0.3)" }}><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            ))}
          </div>
          <div>
            <span style={label}>Duración mínima de reserva</span>
            <div className="flex gap-2">
              {SLOT_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setForm(f => ({ ...f, slotMinutes: o.value }))}
                  className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors border`}
                  style={{ background: form.slotMinutes === o.value ? "rgba(201,168,76,0.15)" : "rgba(13,27,42,0.04)", color: form.slotMinutes === o.value ? GOLD : "rgba(13,27,42,0.4)", borderColor: form.slotMinutes === o.value ? GOLD : "rgba(201,168,76,0.2)" }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="h-10 px-6 rounded-xl text-sm font-bold transition-colors"
        style={{ background: GOLD, color: NAVY }}>
        {saving ? "Guardando…" : "Guardar configuración"}
      </button>

      {/* Feriados */}
      <div style={card}>
        <div style={cardHeader}>
          <div className="flex items-center gap-2">
            <CalendarX2 className="w-4 h-4" style={{ color: GOLD }} />
            <div>
              <p className="text-sm font-bold" style={{ color: NAVY }}>Días feriados</p>
              <p className="text-xs" style={{ color: "rgba(13,27,42,0.4)" }}>Cierra el club o aplica recargo en fechas especiales</p>
            </div>
          </div>
          <button onClick={() => setShowHolidayForm(v => !v)} className="flex items-center gap-1 text-xs font-bold" style={{ color: GOLD }}>
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>

        {showHolidayForm && (
          <div className="p-5 space-y-3" style={{ borderBottom: BORDER }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span style={label}>Fecha</span>
                <input type="date" value={holidayForm.date} onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full h-10 rounded-lg px-3 text-sm outline-none"
                  style={{ background: "rgba(201,168,76,0.06)", border: BORDER, color: NAVY, colorScheme: "light" }} />
              </div>
              <div>
                <span style={label}>Nombre</span>
                <input value={holidayForm.name} onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))} placeholder="ej: 18 de Septiembre"
                  className="w-full h-10 rounded-lg px-3 text-sm outline-none"
                  style={{ background: "rgba(201,168,76,0.06)", border: BORDER, color: NAVY }} />
              </div>
            </div>
            <div className="flex gap-2">
              {[{ value: "CLOSED", label: "Cerrado" }, { value: "SURCHARGE", label: "Abierto con recargo" }].map(opt => (
                <button key={opt.value} type="button" onClick={() => setHolidayForm(f => ({ ...f, type: opt.value }))}
                  className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition-colors`}
                  style={{ background: holidayForm.type === opt.value ? "rgba(201,168,76,0.15)" : "rgba(13,27,42,0.04)", color: holidayForm.type === opt.value ? GOLD : "rgba(13,27,42,0.4)", borderColor: holidayForm.type === opt.value ? GOLD : "rgba(201,168,76,0.2)" }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {holidayForm.type === "SURCHARGE" && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <span style={label}>Tipo</span>
                  <div className="flex gap-2">
                    {[{ value: "PERCENT", label: "%" }, { value: "FIXED", label: "$" }].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setHolidayForm(f => ({ ...f, surchargeType: opt.value }))}
                        className="flex-1 h-9 rounded-lg text-xs font-bold border transition-colors"
                        style={{ background: holidayForm.surchargeType === opt.value ? "rgba(201,168,76,0.15)" : "rgba(13,27,42,0.04)", color: holidayForm.surchargeType === opt.value ? GOLD : "rgba(13,27,42,0.4)", borderColor: holidayForm.surchargeType === opt.value ? GOLD : "rgba(201,168,76,0.2)" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <span style={label}>{holidayForm.surchargeType === "PERCENT" ? "Porcentaje (ej: 30)" : "Monto fijo (ej: 5000)"}</span>
                  <input type="number" min="0" value={holidayForm.surchargeValue} onChange={e => setHolidayForm(f => ({ ...f, surchargeValue: e.target.value }))}
                    placeholder={holidayForm.surchargeType === "PERCENT" ? "30" : "5000"}
                    className="w-full h-10 rounded-lg px-3 text-sm outline-none"
                    style={{ background: "rgba(201,168,76,0.06)", border: BORDER, color: NAVY }} />
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={handleAddHoliday} disabled={savingHoliday}
                className="h-9 px-4 rounded-lg text-xs font-bold"
                style={{ background: GOLD, color: NAVY }}>
                {savingHoliday ? "Guardando…" : "Agregar feriado"}
              </button>
              <button onClick={() => { setShowHolidayForm(false); setHolidayForm({ ...EMPTY_HOLIDAY }) }}
                className="h-9 px-4 rounded-lg text-xs font-semibold" style={{ color: "rgba(13,27,42,0.4)" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div>
          {holidays.length === 0 && !showHolidayForm && (
            <p className="px-5 py-6 text-xs text-center" style={{ color: "rgba(13,27,42,0.3)" }}>No hay feriados configurados</p>
          )}
          {holidays.map(h => (
            <div key={h.id} className="px-5 py-3.5 flex items-center gap-3" style={{ borderBottom: BORDER }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: h.type === "CLOSED" ? "#ef4444" : GOLD }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: NAVY }}>{h.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.4)" }}>
                  {new Date(h.date).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                  {h.type === "CLOSED" && <span className="ml-2" style={{ color: "#ef4444" }}>· Cerrado</span>}
                  {h.type === "SURCHARGE" && h.surchargeValue && <span className="ml-2" style={{ color: GOLD }}>· Recargo {h.surchargeType === "PERCENT" ? `${h.surchargeValue}%` : `$${Number(h.surchargeValue).toLocaleString("es-CL")}`}</span>}
                </p>
              </div>
              <button onClick={() => handleDeleteHoliday(h.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                style={{ color: "rgba(13,27,42,0.2)" }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
