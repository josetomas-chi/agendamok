"use client"
import React, { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ChevronDown, X } from "lucide-react"

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
      pricePerHour = Number(rule.price)
      break
    }
  }
  return pricePerHour * durationHours
}

export default function NewBookingModal({
  businessId, courts, clients, onClose, onSaved,
}: {
  businessId: string
  courts: Court[]
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({ courtId: courts[0]?.id || "", clientId: "", date: new Date().toISOString().slice(0, 10), startTime: "09:00", endTime: "10:00", notes: "" })
  const [saving, setSaving] = useState(false)
  const [allCourts, setAllCourts] = useState<Court[]>(courts)

  useEffect(() => {
    fetch(`/api/businesses/${businessId}/courts`).then(r => r.json()).then(d => setAllCourts(d.courts || []))
  }, [businessId])

  const selectedCourt = allCourts.find(c => c.id === form.courtId)
  const price = calcPrice(selectedCourt, form.startTime, form.endTime, form.date)

  async function handleSave() {
    if (!form.courtId || !form.date || !form.startTime || !form.endTime) { toast.error("Completa todos los campos requeridos"); return }
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/court-bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courtId: form.courtId,
        clientId: form.clientId || null,
        startTime: `${form.date}T${form.startTime}:00`,
        endTime: `${form.date}T${form.endTime}:00`,
        notes: form.notes || null,
      }),
    })
    if (r.ok) { toast.success("Reserva creada"); onSaved() }
    else { const d = await r.json(); toast.error(d.error || "Error al crear") }
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden border-white/[0.08]">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Nueva reserva</h2>
            <p className="text-xs text-white/35 mt-0.5">Asigna una cancha y horario</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pb-5 space-y-3">
          {/* Cancha */}
          <div className="relative">
            <select value={form.courtId} onChange={e => setForm(f => ({ ...f, courtId: e.target.value }))}
              className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-9 text-sm text-white focus:outline-none focus:border-sky-500/60 appearance-none">
              <option value="" disabled>Seleccionar cancha</option>
              {allCourts.filter(c => c.isActive !== false).map(c => <option key={c.id} value={c.id}>{c.name}{c.sport ? ` (${c.sport})` : ""}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          </div>
          {/* Cliente */}
          <div className="relative">
            <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
              className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-9 text-sm text-white focus:outline-none focus:border-sky-500/60 appearance-none">
              <option value="">Sin cliente (reserva anónima)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          </div>
          {/* Fecha */}
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white focus:outline-none focus:border-sky-500/60 [color-scheme:dark]" />
          {/* Horario */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-white/35 mb-1.5 uppercase tracking-wide">Inicio</p>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white focus:outline-none focus:border-sky-500/60 [color-scheme:dark]" />
            </div>
            <div>
              <p className="text-[10px] text-white/35 mb-1.5 uppercase tracking-wide">Fin</p>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white focus:outline-none focus:border-sky-500/60 [color-scheme:dark]" />
            </div>
          </div>
          {/* Precio calculado */}
          {price > 0 && (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-2.5 flex items-center justify-between">
              <p className="text-xs text-white/50">Precio estimado</p>
              <p className="text-sm font-semibold text-sky-400">${price.toLocaleString("es-CL")}</p>
            </div>
          )}
          {/* Notas */}
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notas (opcional)"
            className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
          <Button onClick={handleSave} disabled={saving} className="w-full bg-sky-500 hover:bg-sky-400 h-11 font-semibold">
            {saving ? "Guardando…" : "Confirmar reserva"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
