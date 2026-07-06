"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Phone, Mail, Clock, User, X, Pencil, Trash2, CheckCircle, DollarSign, ChevronDown, CalendarDays } from "lucide-react"
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
  client: { name: string; email: string | null; phone: string | null; segment?: string }
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

function ClientCombobox({ clients, value, onChange }: {
  clients: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const selected = clients.find(c => c.id === value)
  const filtered = query.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : clients

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery("") }}
        className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-9 text-sm text-left flex items-center focus:outline-none focus:border-sky-500/60 focus:bg-white/[0.08] transition-colors"
      >
        <span className={selected ? "text-white" : "text-white/25"}>
          {selected ? selected.name : "Cliente"}
        </span>
        {selected && (
          <button
            type="button"
            onMouseDown={e => { e.stopPropagation(); onChange(""); setQuery("") }}
            className="ml-auto mr-6 text-white/30 hover:text-white/60"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>
      <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-white/30 pointer-events-none" />

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border border-white/[0.08] bg-[#28282c] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/[0.06]">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-sky-500/60"
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            <button
              type="button"
              onMouseDown={() => { onChange(""); setOpen(false); setQuery("") }}
              className="w-full px-4 py-2.5 text-sm text-left text-white/35 hover:bg-white/[0.05] transition-colors"
            >
              Sin cliente asignado
            </button>
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-white/25">Sin resultados</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => { onChange(c.id); setOpen(false); setQuery("") }}
                  className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${value === c.id ? "bg-sky-500/15 text-sky-300" : "text-white hover:bg-white/[0.05]"}`}
                >
                  {c.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CalendarWithNew({ businessId, services, staff, clients, locations = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [staffLocked, setStaffLocked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [appts, setAppts] = useState<Appointment[]>([])
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ date: "", time: "", staffId: "", notes: "" })
  const [editSaving, setEditSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payForm, setPayForm] = useState({ method: "CASH", amount: "" })
  const [payDiscount, setPayDiscount] = useState(0)
  const [paying, setPaying] = useState(false)
  const [segmentDiscounts, setSegmentDiscounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch(`/api/businesses/${businessId}`).then(r => r.json()).then(d => {
      const sd = d.business?.segmentDiscounts
      if (sd && typeof sd === "object") setSegmentDiscounts(sd as Record<string, number>)
    }).catch(() => {})
  }, [businessId])

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

  function handleNewAppointment(date: string, time: string, staffId?: string) {
    setForm({ ...DEFAULT_FORM, date, time, staffId: staffId || "" })
    setStaffLocked(!!staffId)
    setOpen(true)
  }

  async function handleCreate() {
    if (!form.serviceId || !form.staffId || !form.date || !form.time) {
      toast.error("Completa todos los campos obligatorios")
      return
    }
    if (new Date(`${form.date}T${form.time}`) < new Date()) {
      toast.error("No puedes crear un turno en un horario que ya pasó")
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
      setStaffLocked(false)
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
    const startTime = new Date(`${editForm.date}T${editForm.time}`).toISOString()
    if (new Date(startTime) < new Date()) {
      toast.error("No puedes reprogramar a un horario que ya pasó")
      return
    }
    setEditSaving(true)
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
    const basePrice = appt.service.price ?? 0
    const segment = appt.client.segment ?? ""
    const discountPct = segmentDiscounts[segment] ?? 0
    const discountedPrice = discountPct > 0
      ? Math.round(basePrice * (1 - discountPct / 100))
      : basePrice
    setPayDiscount(discountPct)
    setPayForm({
      method: "CASH",
      amount: basePrice > 0 ? String(discountedPrice) : "",
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
          setAppts(prev => prev.map(a => {
            if (a.id !== id) return a
            const start = new Date(newStartTime)
            const oldStart = new Date(a.startTime)
            const oldEnd = new Date(a.endTime)
            const durationMs = oldEnd.getTime() - oldStart.getTime()
            const newEnd = new Date(start.getTime() + durationMs)
            return { ...a, startTime: newStartTime, endTime: newEnd.toISOString() }
          }))
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
        <DialogContent className="max-w-sm" accent="sky">
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
        <DialogContent className="max-w-sm" accent="violet">
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedAppt && (
              <div className="flex items-center gap-2 text-sm text-white/50 bg-white/[0.03] rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedAppt.service.color }} />
                <span className="flex-1">{selectedAppt.service.name} · {selectedAppt.client.name}</span>
                {payDiscount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 flex-shrink-0">
                    -{payDiscount}% descuento
                  </span>
                )}
              </div>
            )}
            {payDiscount === 100 && (
              <p className="text-xs text-center text-green-400 font-medium -mt-1">Servicio gratuito — monto $0</p>
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

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(DEFAULT_FORM); setStaffLocked(false) } }}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden border-white/[0.08]" accent="sky">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-white">Nuevo turno</h2>
              <p className="text-xs text-white/35 mt-0.5">Completa los datos del turno</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-2">
            {/* Servicio */}
            <div className="relative">
              <select value={form.serviceId} onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-9 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/60 focus:bg-white/[0.08] transition-colors"
                style={{ colorScheme: "dark" }}>
                <option value="" style={{ backgroundColor: "#28282c" }}>Selecciona un servicio</option>
                {services.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: "#28282c" }}>{s.name} · {s.duration} min</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-white/30 pointer-events-none" />
            </div>

            {/* Profesional + Cliente */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                {staffLocked ? (
                  <div className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm flex items-center gap-2 text-white/60 select-none">
                    <span className="truncate text-white">{staff.find(s => s.id === form.staffId)?.user.name}</span>
                    <span className="ml-auto text-[10px] text-sky-400/60 flex-shrink-0">fijo</span>
                  </div>
                ) : (
                  <>
                    <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-9 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/60 focus:bg-white/[0.08] transition-colors"
                      style={{ colorScheme: "dark" }}>
                      <option value="" style={{ backgroundColor: "#28282c" }}>Profesional</option>
                      {staff.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: "#28282c" }}>{s.user.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-white/30 pointer-events-none" />
                  </>
                )}
              </div>
              <ClientCombobox
                clients={clients}
                value={form.clientId}
                onChange={id => setForm(f => ({ ...f, clientId: id }))}
              />
            </div>

            {/* Fecha + Hora */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white focus:outline-none focus:border-sky-500/60 focus:bg-white/[0.08] transition-colors"
                  style={{ colorScheme: "dark" }} />
              </div>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <select
                    value={form.time ? form.time.split(":")[0] : ""}
                    onChange={e => setForm(f => ({ ...f, time: `${e.target.value}:${f.time.split(":")[1] || "00"}` }))}
                    className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 pr-7 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/60 transition-colors"
                    style={{ colorScheme: "dark" }}>
                    <option value="" style={{ backgroundColor: "#28282c" }}>hh</option>
                    {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                      <option key={h} value={String(h).padStart(2, "0")} style={{ backgroundColor: "#28282c" }}>{String(h).padStart(2, "0")}h</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-3.5 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
                <div className="relative flex-1">
                  <select
                    value={form.time ? form.time.split(":")[1] : ""}
                    onChange={e => setForm(f => ({ ...f, time: `${f.time.split(":")[0] || "08"}:${e.target.value}` }))}
                    className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 pr-7 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/60 transition-colors"
                    style={{ colorScheme: "dark" }}>
                    <option value="" style={{ backgroundColor: "#28282c" }}>mm</option>
                    <option value="00" style={{ backgroundColor: "#28282c" }}>:00</option>
                    <option value="30" style={{ backgroundColor: "#28282c" }}>:30</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-3.5 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Sede */}
            {locations.length > 0 && (
              <div className="relative">
                <select value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-9 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/60 transition-colors"
                  style={{ colorScheme: "dark" }}>
                  <option value="" style={{ backgroundColor: "#28282c" }}>Sin sede específica</option>
                  {locations.map(l => <option key={l.id} value={l.id} style={{ backgroundColor: "#28282c" }}>{l.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-white/30 pointer-events-none" />
              </div>
            )}

            {/* Notas */}
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas opcionales..."
              className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-sky-500/60 focus:bg-white/[0.08] transition-colors"
            />

            {/* CTA */}
            <div className="pt-1">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                {saving ? "Guardando..." : "Crear turno"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}





