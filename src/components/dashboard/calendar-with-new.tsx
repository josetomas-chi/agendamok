"use client"

import { useState, useEffect, useCallback } from "react"
import { Phone, Mail, Clock, User, X, Pencil, Trash2, CheckCircle, DollarSign } from "lucide-react"
import { CalendarView } from "./calendar-view"
import { ApptDetailDialog } from "./appt-detail-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

type Appointment = {
  id: string; startTime: Date | string; endTime: Date | string; status: string
  service: { name: string; color: string; price: number | null }
  staff: { id: string; color: string; user: { name: string | null; image: string | null } }
  client: { name: string; email: string | null; phone: string | null }
  notes: string | null
  payment: { status: string; method: string; amount: number } | null
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
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ date: "", time: "", staffId: "", notes: "" })
  const [editSaving, setEditSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payForm, setPayForm] = useState({ method: "CASH", amount: "" })
  const [paying, setPaying] = useState(false)

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

  function openEdit(appt: Appointment) {
    const start = new Date(appt.startTime)
    setEditForm({
      date: start.toISOString().split("T")[0],
      time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      staffId: appt.staff.id,
      notes: appt.notes || "",
    })
    setEditOpen(true)
  }

  async function handleEdit() {
    if (!selectedAppt || !editForm.date || !editForm.time) return
    setEditSaving(true)
    const startTime = new Date(`${editForm.date}T${editForm.time}`).toISOString()
    const r = await fetch(`/api/businesses/${businessId}/appointments/${selectedAppt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime,
        staffId: editForm.staffId || undefined,
        notes: editForm.notes || undefined,
      }),
    })
    if (r.ok) {
      toast.success("Turno actualizado")
      setEditOpen(false)
      setSelectedAppt(null)
      fetchAppts()
    } else {
      const d = await r.json()
      toast.error(d.error || "Error al actualizar")
    }
    setEditSaving(false)
  }

  async function handleCancel() {
    if (!selectedAppt) return
    if (!confirm("¿Cancelar este turno? Esta acción no se puede deshacer.")) return
    setCancelling(true)
    const r = await fetch(`/api/businesses/${businessId}/appointments/${selectedAppt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    })
    if (r.ok) {
      toast.success("Turno cancelado")
      setAppts(prev => prev.filter(a => a.id !== selectedAppt.id))
      setSelectedAppt(null)
    } else {
      toast.error("Error al cancelar")
    }
    setCancelling(false)
  }

  async function handleComplete() {
    if (!selectedAppt) return
    const r = await fetch(`/api/businesses/${businessId}/appointments/${selectedAppt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    })
    if (r.ok) {
      toast.success("Turno marcado como completado")
      setAppts(prev => prev.map(a => a.id === selectedAppt.id ? { ...a, status: "COMPLETED" } : a))
      setSelectedAppt(prev => prev ? { ...prev, status: "COMPLETED" } : null)
    } else {
      toast.error("Error al actualizar")
    }
  }

  function openPay(appt: Appointment) {
    setPayForm({
      method: "CASH",
      amount: appt.service.price != null ? String(appt.service.price) : "",
    })
    setPayOpen(true)
  }

  async function handlePay() {
    if (!selectedAppt || !payForm.amount) return
    setPaying(true)
    const r = await fetch(`/api/businesses/${businessId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: selectedAppt.id, method: payForm.method, amount: Number(payForm.amount) }),
    })
    if (r.ok) {
      const { payment } = await r.json()
      toast.success("Pago registrado")
      setPayOpen(false)
      const updated = { ...selectedAppt, status: "COMPLETED", payment: { status: "PAID", method: payment.method, amount: Number(payment.amount) } }
      setAppts(prev => prev.map(a => a.id === selectedAppt.id ? updated : a))
      setSelectedAppt(updated)
    } else {
      toast.error("Error al registrar el pago")
    }
    setPaying(false)
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

      <ApptDetailDialog
        appt={selectedAppt}
        cancelling={cancelling}
        onClose={() => setSelectedAppt(null)}
        onEdit={openEdit}
        onPay={openPay}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />

      {/* Edit appointment dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Modificar turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedAppt && (
              <div className="flex items-center gap-2 text-sm text-white/50 bg-white/[0.03] rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedAppt.service.color }} />
                {selectedAppt.service.name} · {selectedAppt.client.name}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora</Label>
                <div className="flex gap-1.5">
                  <select
                    value={editForm.time.split(":")[0] || ""}
                    onChange={e => setEditForm(f => ({ ...f, time: `${e.target.value}:${f.time.split(":")[1] || "00"}` }))}
                    className="flex-1 h-9 rounded-md border border-input px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                      <option key={h} value={String(h).padStart(2, "0")} style={{ backgroundColor: "#3a3a3c" }}>{String(h).padStart(2, "0")}h</option>
                    ))}
                  </select>
                  <select
                    value={editForm.time.split(":")[1] || "00"}
                    onChange={e => setEditForm(f => ({ ...f, time: `${f.time.split(":")[0] || "09"}:${e.target.value}` }))}
                    className="flex-1 h-9 rounded-md border border-input px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}
                  >
                    <option value="00" style={{ backgroundColor: "#3a3a3c" }}>:00</option>
                    <option value="30" style={{ backgroundColor: "#3a3a3c" }}>:30</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Profesional</Label>
              <select
                value={editForm.staffId}
                onChange={e => setEditForm(f => ({ ...f, staffId: e.target.value }))}
                className="w-full h-9 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}
              >
                {staff.map(s => (
                  <option key={s.id} value={s.id} style={{ backgroundColor: "#3a3a3c" }}>{s.user.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional..." />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleEdit} disabled={editSaving}>
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedAppt && (
              <div className="flex items-center gap-2 text-sm text-white/50 bg-white/[0.03] rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedAppt.service.color }} />
                {selectedAppt.service.name} · {selectedAppt.client.name}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-3 gap-2">
                {([["CASH", "Efectivo"], ["CARD", "Tarjeta"], ["TRANSFER", "Transferencia"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setPayForm(f => ({ ...f, method: val }))}
                    className={`py-2.5 rounded-xl border text-xs font-medium transition-colors ${payForm.method === val ? "bg-violet-500/20 border-violet-400/40 text-violet-300" : "bg-white/[0.03] border-white/10 text-white/50 hover:text-white hover:border-white/20"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Monto ($)</Label>
              <Input
                type="number"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <p className="text-xs text-white/30">El turno se marcará automáticamente como completado al registrar el pago.</p>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 bg-violet-600 hover:bg-violet-500" onClick={handlePay} disabled={paying || !payForm.amount}>
                {paying ? "Registrando..." : "Confirmar cobro"}
              </Button>
              <Button variant="outline" onClick={() => setPayOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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





