"use client"

import { useState } from "react"
import { CalendarView } from "./calendar-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type Appointment = {
  id: string; startTime: Date | string; endTime: Date | string; status: string
  service: { name: string; color: string }
  staff: { user: { name: string | null } }
  client: { name: string }
}

type Service = { id: string; name: string; duration: number }
type Staff = { id: string; user: { name: string | null } }
type Client = { id: string; name: string }

interface Props {
  appointments: Appointment[]
  businessId: string
  services: Service[]
  staff: Staff[]
  clients: Client[]
}

const DEFAULT_FORM = { serviceId: "", staffId: "", clientId: "", date: "", time: "", notes: "" }

export function CalendarWithNew({ appointments, businessId, services, staff, clients }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [appts, setAppts] = useState(appointments)

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
        startTime: new Date(`${form.date}T${form.time}`).toISOString(),
        notes: form.notes || undefined,
        status: "CONFIRMED",
      }),
    })

    if (r.ok) {
      const d = await r.json()
      setAppts(prev => [...prev, d.appointment])
      toast.success("Turno creado")
      setOpen(false)
      setForm(DEFAULT_FORM)
    } else {
      const d = await r.json()
      toast.error(d.error || "Error al crear turno")
    }
    setSaving(false)
  }

  return (
    <>
      <CalendarView
        appointments={appts}
        businessId={businessId}
        onNewAppointment={handleNewAppointment}
      />

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
