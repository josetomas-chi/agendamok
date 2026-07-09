"use client"

import { useState, useEffect, useCallback } from "react"
import { useBusiness } from "@/contexts/business-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Search, Clock, FileText, ExternalLink, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Appointment = {
  id: string; startTime: string; endTime: string; status: string; notes: string | null; price?: number | null
  service: { name: string; color: string; duration: number; price: number }
  staff: { id: string; color: string; user: { name: string | null } }
  client: { id: string; name: string; email: string | null; phone: string | null }
  payment: { id: string; amount: number; status: string; method: string } | null
}
type Service = { id: string; name: string; duration: number; price: number; color: string }
type Staff = { id: string; user: { name: string | null } }
type Client = { id: string; name: string }

const STATUS = {
  PENDING:   { label: "Pendiente",      color: "bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.15)]" },
  CONFIRMED: { label: "Confirmado",     color: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" },
  COMPLETED: { label: "Completado",     color: "bg-white/8 text-white/40 border-white/10" },
  CANCELLED: { label: "Cancelado",      color: "bg-red-500/20 text-red-400 border-red-400/30" },
  NO_SHOW:   { label: "No se presentó", color: "bg-orange-500/25 text-orange-300 border-orange-400/50 shadow-[0_0_8px_rgba(249,115,22,0.2)]" },
}

const DEFAULT_FORM = { serviceId: "", staffId: "", clientId: "", date: "", time: "", notes: "" }

export default function AppointmentsPage() {
  const { businessId, hasBsale } = useBusiness()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [emitting, setEmitting] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    if (!businessId) return
    loadAppts(businessId, "")
    loadFormData(businessId)
  }, [businessId])

  async function loadFormData(bid: string) {
    const [svcRes, stfRes, cliRes] = await Promise.all([
      fetch(`/api/businesses/${bid}/services`),
      fetch(`/api/businesses/${bid}/staff`),
      fetch(`/api/businesses/${bid}/clients`),
    ])
    const [svcData, stfData, cliData] = await Promise.all([svcRes.json(), stfRes.json(), cliRes.json()])
    setServices(svcData.services || [])
    setStaff(stfData.staff || [])
    setClients(cliData.clients || [])
  }

  const loadAppts = useCallback(async (bid: string, status: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    const r = await fetch(`/api/businesses/${bid}/appointments?${params}`)
    const d = await r.json()
    setAppointments(d.appointments || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (businessId) loadAppts(businessId, statusFilter)
  }, [statusFilter, businessId, loadAppts])

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
        clientId: form.clientId || undefined,
        startTime: new Date(`${form.date}T${form.time}`).toISOString(),
        notes: form.notes || undefined,
        status: "CONFIRMED",
      }),
    })
    if (r.ok) {
      toast.success("Turno creado")
      setNewOpen(false)
      setForm(DEFAULT_FORM)
      loadAppts(businessId, statusFilter)
    } else {
      const d = await r.json()
      toast.error(d.error || "Error al crear turno")
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/businesses/${businessId}/appointments/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    toast.success("Estado actualizado")
    setSelected(null)
    loadAppts(businessId, statusFilter)
  }

  async function emitBoleta() {
    if (!selected?.payment) return
    setEmitting(true)
    const r = await fetch(`/api/businesses/${businessId}/invoices`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: selected.payment.id, clientName: selected.client.name }),
    })
    const data = await r.json()
    if (r.ok) {
      toast.success("Boleta emitida correctamente")
      if (data.invoice?.pdfUrl) window.open(data.invoice.pdfUrl, "_blank")
    } else {
      toast.error(data.error || "Error al emitir boleta")
    }
    setEmitting(false)
  }

  const filtered = appointments.filter(a =>
    !search ||
    a.client.name.toLowerCase().includes(search.toLowerCase()) ||
    a.service.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Turnos</h1>
          <p className="page-subtitle">{filtered.length} turnos encontrados</p>
        </div>
        <Button className="gap-2" onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4" /> Nuevo turno
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por cliente o servicio..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[["", "Todos"], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button key={k} onClick={() => setStatusFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${statusFilter === k ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 select-none">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mb-5 opacity-20">
            <rect x="8" y="16" width="56" height="48" rx="8" stroke="white" strokeWidth="2.5"/>
            <path d="M8 28h56" stroke="white" strokeWidth="2.5"/>
            <rect x="22" y="8" width="4" height="14" rx="2" fill="white"/>
            <rect x="46" y="8" width="4" height="14" rx="2" fill="white"/>
            <rect x="20" y="38" width="10" height="10" rx="2" fill="white" opacity=".4"/>
            <rect x="36" y="38" width="10" height="10" rx="2" fill="white" opacity=".4"/>
          </svg>
          <p className="text-white/70 font-semibold text-base">La agenda está libre</p>
          <p className="text-white/30 text-sm mt-1.5 max-w-xs text-center">Todavía no hay turnos en este período</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {filtered.map((a, i) => (
            <div key={a.id} onClick={() => setSelected(a)}
              className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-white/5 transition-colors ${i !== filtered.length - 1 ? "border-b border-white/10" : ""}`}>
              <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: a.service.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{a.client.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS[a.status as keyof typeof STATUS]?.color}`}>
                    {STATUS[a.status as keyof typeof STATUS]?.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                  <span>{a.service.name}</span>
                  <span>•</span>
                  <span>{a.staff.user.name}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-medium text-sm">{format(new Date(a.startTime), "d MMM", { locale: es })}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" />
                  {format(new Date(a.startTime), "HH:mm")} — {format(new Date(a.endTime), "HH:mm")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New appointment dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
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
                      {["00", "10", "20", "30", "40", "50"].map(m => (
                        <SelectItem key={m} value={m}>{m} min</SelectItem>
                      ))}
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
              <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalle del turno</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: selected.service.color }} />
                <div>
                  <p className="font-semibold">{selected.service.name}</p>
                  <p className="text-sm text-muted-foreground">{selected.service.duration} min • ${Number(selected.price ?? selected.service.price).toLocaleString("es-CL")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Cliente", value: selected.client.name },
                  { label: "Profesional", value: selected.staff.user.name },
                  { label: "Fecha", value: format(new Date(selected.startTime), "EEEE d MMMM", { locale: es }) },
                  { label: "Hora", value: `${format(new Date(selected.startTime), "HH:mm")} — ${format(new Date(selected.endTime), "HH:mm")}` },
                  ...(selected.client.email ? [{ label: "Email", value: selected.client.email }] : []),
                  ...(selected.client.phone ? [{ label: "Telefono", value: selected.client.phone }] : []),
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium capitalize">{value}</p>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{selected.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Cambiar estado</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(STATUS).map(([k, v]) => (
                    <button key={k} onClick={() => updateStatus(selected.id, k)}
                      disabled={selected.status === k}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selected.status === k ? "opacity-50 cursor-not-allowed " + v.color : "hover:bg-muted border-border"}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasBsale && selected.payment?.status === "PAID" && (
                <Button variant="outline" className="w-full gap-2" onClick={emitBoleta} disabled={emitting}>
                  {emitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {emitting ? "Emitiendo boleta..." : "Emitir boleta (Bsale)"}
                  {!emitting && <ExternalLink className="w-3 h-3 ml-auto opacity-50" />}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
