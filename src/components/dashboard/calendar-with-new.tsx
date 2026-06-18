"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Phone, Mail, Clock, User, X } from "lucide-react"
import { CalendarView } from "./calendar-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type Appointment = {
  id: string; startTime: Date | string; endTime: Date | string; status: string
  service: { name: string; color: string }
  staff: { id: string; color: string; user: { name: string | null; image: string | null } }
  client: { name: string; email: string | null; phone: string | null }
  notes: string | null
}

type Service = { id: string; name: string; duration: number }
type Staff = { id: string; color: string; user: { name: string | null; image: string | null } }
type Client = { id: string; name: string }
type Location = { id: string; name: string }

interface Props {
  businessId: string
  services: Service[]
  staff: Staff[]
  clients: Client[]
  locations?: Location[]
}

const DEFAULT_FORM = { serviceId: "", staffId: "", clientId: "", locationId: "", date: "", time: "", notes: "" }

export function CalendarWithNew({ businessId, services, staff, clients, locations = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [appts, setAppts] = useState<Appointment[]>([])
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const fetchAppts = useCallback(async (signal?: AbortSignal) => {
    const from = new Date()
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
    const to = new Date(from.getFullYear(), from.getMonth() + 2, 0, 23, 59, 59)
    try {
      const r = await fetch(
        `/api/businesses/${businessId}/appointments?from=${from.toISOString()}&to=${to.toISOString()}`,
        { signal }
      )
      if (r.ok) {
        const d = await r.json()
        setAppts(d.appointments ?? [])
      }
    } catch {
      // AbortError — fetch cancelled, ignore
    }
  }, [businessId])

  useEffect(() => {
    const controller = new AbortController()
    fetchAppts(controller.signal)
    return () => controller.abort()
  }, [fetchAppts])

  function handleNewAppointment(date: string, time: string) {
    setForm({ ...DEFAULT_FORM, date, time })
    setOpen(true)
  }

  async function handleCreate() {
    if (!form.serviceId || !form.staffId || !form.date || !form.time) {
      toast.error("Completa todos los campos obligatorios")
      return
    }
    setSaving(true)

    const r = await fetch(`/api/businesses/${businessId}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: form.serviceId,
        staffId: form.staffId,
        clientId: form.clientId || undefined,
        locationId: form.locationId || undefined,
        startTime: new Date(`${form.date}T${form.time}`).toISOString(),
        notes: form.notes || undefined,
        status: "CONFIRMED",
      }),
    })

    if (r.ok) {
      const d = await r.json()
      // Optimistic update — show immediately
      setAppts(prev => [...prev, d.appointment])
      setOpen(false)
      setForm(DEFAULT_FORM)
      toast.success("Turno creado")
      // Reload from server after a tick so the DB write is visible
      setTimeout(() => fetchAppts(), 500)
    } else {
      const d = await r.json()
      toast.error(d.error || "Error al crear turno")
    }
    setSaving(false)
  }

  function formatTime(dt: Date | string) {
    return new Date(dt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      <CalendarView
        appointments={appts}
        staffMembers={staff}
        businessId={businessId}
        onNewAppointment={handleNewAppointment}
        onAppointmentClick={(id) => {
          const appt = appts.find(a => a.id === id)
          if (appt) setSelectedAppt(appt)
        }}
        onAppointmentMoved={(id, newStartTime) => {
          setAppts(prev => prev.map(a =>
            a.id === id ? { ...a, startTime: newStartTime } : a
          ))
        }}
      />

      {/* Appointment detail popup */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAppt(null)}>
          <div
            ref={popupRef}
            className="bg-[#2c2c30] border border-white/10 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedAppt.service.color }} />
                <h3 className="font-semibold text-white">{selectedAppt.service.name}</h3>
              </div>
              <button onClick={() => setSelectedAppt(null)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-white/40 flex-shrink-0" />
                <span className="text-white/70">
                  {formatTime(selectedAppt.startTime)} – {formatTime(selectedAppt.endTime)}
                </span>
              </div>

              <div className="border-t border-white/5 pt-3 space-y-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <span className="text-white font-medium">{selectedAppt.client.name}</span>
                </div>
                {selectedAppt.client.phone && (
                  <a href={`tel:${selectedAppt.client.phone}`} className="flex items-center gap-3 text-sm group">
                    <Phone className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <span className="text-sky-400 group-hover:text-sky-300 transition-colors">{selectedAppt.client.phone}</span>
                  </a>
                )}
                {selectedAppt.client.email && (
                  <a href={`mailto:${selectedAppt.client.email}`} className="flex items-center gap-3 text-sm group">
                    <Mail className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <span className="text-sky-400 group-hover:text-sky-300 transition-colors">{selectedAppt.client.email}</span>
                  </a>
                )}
                {selectedAppt.notes && (
                  <div className="mt-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-xs text-white/50">
                    {selectedAppt.notes}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-xs text-white/30">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedAppt.staff.user.image ? undefined : selectedAppt.staff.color }} />
                {selectedAppt.staff.user.name}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Servicio *</Label>
              <select value={form.serviceId} onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
                className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}>
                <option value="" style={{ backgroundColor: "#3a3a3c" }}>Selecciona un servicio</option>
                {services.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: "#3a3a3c" }}>{s.name} — {s.duration} min</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Profesional *</Label>
              <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
                className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}>
                <option value="" style={{ backgroundColor: "#3a3a3c" }}>Selecciona un profesional</option>
                {staff.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: "#3a3a3c" }}>{s.user.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}>
                <option value="" style={{ backgroundColor: "#3a3a3c" }}>Sin cliente asignado</option>
                {clients.map(c => <option key={c.id} value={c.id} style={{ backgroundColor: "#3a3a3c" }}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora *</Label>
                <div className="flex gap-2">
                  <select
                    value={form.time ? form.time.split(":")[0] : ""}
                    onChange={e => setForm(f => ({ ...f, time: `${e.target.value}:${f.time.split(":")[1] || "00"}` }))}
                    className="flex-1 h-9 rounded-md border border-input px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}>
                    <option value="" style={{ backgroundColor: "#3a3a3c" }}>HH</option>
                    {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                      <option key={h} value={String(h).padStart(2, "0")} style={{ backgroundColor: "#3a3a3c" }}>{String(h).padStart(2, "0")}h</option>
                    ))}
                  </select>
                  <select
                    value={form.time ? form.time.split(":")[1] : ""}
                    onChange={e => setForm(f => ({ ...f, time: `${f.time.split(":")[0] || "08"}:${e.target.value}` }))}
                    className="flex-1 h-9 rounded-md border border-input px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}>
                    <option value="" style={{ backgroundColor: "#3a3a3c" }}>MM</option>
                    <option value="00" style={{ backgroundColor: "#3a3a3c" }}>:00</option>
                    <option value="30" style={{ backgroundColor: "#3a3a3c" }}>:30</option>
                  </select>
                </div>
              </div>
            </div>
            {locations.length > 0 && (
              <div className="space-y-1.5">
                <Label>Sede</Label>
                <select value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}>
                  <option value="" style={{ backgroundColor: "#3a3a3c" }}>Sin sede específica</option>
                  {locations.map(l => <option key={l.id} value={l.id} style={{ backgroundColor: "#3a3a3c" }}>{l.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional..." />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? "Guardando..." : "Crear turno"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
