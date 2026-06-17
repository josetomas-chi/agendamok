"use client"

import { useState } from "react"
import { CalendarView } from "./calendar-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    setForm({ ...DEFAULT_FORM, date, time: time.split(":")[0].padStart(2, "0") + ":00" })
    setOpen(true)
  }

  async function handleCreate() {
    if (!form.serviceId || !form.staffId || !form.date || !form.time) {
      toast.error("Completa todos los campos obligatorios")
      return
    }
    setSaving(true)
    const service = services.find(s => s.id === form.serviceId)
    const startTime = new Date(`${form.date}T${form.time}`)
    const endTime = new Date(startTime.getTime() + (service?.duration || 60) * 60000)

    const r = await fetch(`/api/businesses/${businessId}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: form.serviceId,
        staffId: form.staffId,
        clientId: form.clientId || null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: form.notes || null,
        status: "CONFIRMED",
      }),
    })

    if (r.ok) {
      const d = await r.json()
      toast.success("Turno creado")
      setOpen(false)
      setForm(DEFAULT_FORM)
      setAppts(prev => [...prev, { ...d.appointment, service: services.find(s => s.id === form.serviceId) || { name: "", color: "#6366f1" }, staff: staff.find(s => s.id === form.staffId) || { user: { name: "" } }, client: { name: "" } }])
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
              <Select value={form.serviceId} onValueChange={v => setForm(f => ({ ...f, serviceId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona un servicio" /></SelectTrigger>
                <SelectContent>
                  {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.duration} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profesional *</Label>
              <Select value={form.staffId} onValueChange={v => setForm(f => ({ ...f, staffId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona un profesional" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.user.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Sin cliente asignado" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora *</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.time ? form.time.split(":")[0] : ""}
                    onValueChange={h => setForm(f => ({ ...f, time: `${h}:${f.time.split(":")[1] || "00"}` }))}
                  >
                    <SelectTrigger><SelectValue placeholder="HH" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                        <SelectItem key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}h</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={form.time ? form.time.split(":")[1] : ""}
                    onValueChange={m => setForm(f => ({ ...f, time: `${f.time.split(":")[0] || "08"}:${m}` }))}
                  >
                    <SelectTrigger><SelectValue placeholder="MM" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="00">:00</SelectItem>
                      <SelectItem value="30">:30</SelectItem>
                    </SelectContent>
                  </Select>
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
