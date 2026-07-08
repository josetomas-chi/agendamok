"use client"

import { useState, useEffect } from "react"
import { useBusiness } from "@/contexts/business-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, Clock, Trash2, Ban, Users, Camera, Mail, Phone, Check } from "lucide-react"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#22c55e","#14b8a6","#0ea5e9"]

type Schedule = { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean }
type StaffMember = {
  id: string; color: string; bio: string | null; specialty: string | null
  commissionType: string; commissionValue: number; isActive: boolean
  user: { id: string; name: string | null; email: string; phone: string | null; image: string | null }
  schedules: Schedule[]
  services: { id: string; name: string }[]
}

const DEFAULT_FORM = { name: "", email: "", phone: "", bio: "", specialty: "", color: "#8b5cf6", commissionType: "PERCENTAGE", commissionValue: 0 }

function ServicesEditor({ businessId, staffId, assignedIds, onSaved }: {
  businessId: string; staffId: string; assignedIds: string[]; onSaved: () => void
}) {
  const [allServices, setAllServices] = useState<{ id: string; name: string; duration: number }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/businesses/${businessId}/services`).then(r => r.json()).then(d => {
      setAllServices(d.services || [])
    })
  }, [businessId])

  async function save() {
    setSaving(true)
    await fetch(`/api/businesses/${businessId}/staff/${staffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds: Array.from(selected) }),
    })
    toast.success("Servicios actualizados")
    setSaving(false)
    onSaved()
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Seleccioná los servicios que puede realizar este profesional.</p>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {allServices.map(s => (
          <button key={s.id} onClick={() => toggle(s.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${selected.has(s.id) ? "border-sky-400/50 bg-sky-500/10" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${selected.has(s.id) ? "bg-sky-500 border-sky-500" : "border-white/20"}`}>
              {selected.has(s.id) && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="flex-1 text-sm text-white/80">{s.name}</span>
            <span className="text-xs text-white/30">{s.duration} min</span>
          </button>
        ))}
        {allServices.length === 0 && <p className="text-xs text-white/30 text-center py-4">No hay servicios creados</p>}
      </div>
      <Button size="sm" onClick={save} disabled={saving} className="w-full">
        {saving ? "Guardando..." : "Guardar servicios"}
      </Button>
    </div>
  )
}

export default function StaffPage() {
  const { businessId } = useBusiness()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) return
    loadStaff(businessId)
  }, [businessId])

  async function loadStaff(bid: string) {
    setLoading(true)
    const r = await fetch(`/api/businesses/${bid}/staff`)
    const d = await r.json()
    setStaff(d.staff || [])
    setLoading(false)
  }

  async function handleCreate() {
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/staff`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, commissionValue: Number(form.commissionValue) }),
    })
    if (r.ok) {
      toast.success("Profesional agregado")
      setOpen(false)
      setForm(DEFAULT_FORM)
      loadStaff(businessId)
    } else {
      const d = await r.json()
      toast.error(d.error || "Error al guardar")
    }
    setSaving(false)
  }

  async function handlePhotoUpload(member: StaffMember, file: File) {
    setUploadingId(member.id)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const r = await fetch("/api/upload", { method: "POST", body: fd })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || "Error al subir imagen"); return }
      const r2 = await fetch(`/api/businesses/${businessId}/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: d.url }),
      })
      if (r2.ok) {
        toast.success("Foto actualizada")
        loadStaff(businessId)
      } else {
        toast.error("Error al guardar la foto")
      }
    } catch {
      toast.error("Error al subir la foto")
    }
    setUploadingId(null)
  }

  async function updateSchedule(staffId: string, schedules: Schedule[]) {
    await fetch(`/api/businesses/${businessId}/staff/${staffId}/schedules`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedules }),
    })
    toast.success("Horarios actualizados")
    loadStaff(businessId)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">Gestiona tu equipo de profesionales</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Agregar profesional
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-2xl">👤</div>
          <p className="font-medium">Todavía no hay profesionales</p>
          <p className="text-sm mt-1">Agrega tu equipo para asignarles citas</p>
          <Button className="mt-4" onClick={() => setOpen(true)}>Agregar profesional</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(member => (
            <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(member)}>
              <div className="h-1.5 w-full" style={{ backgroundColor: member.color }} />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <label className="relative w-11 h-11 flex-shrink-0 cursor-pointer group/photo" onClick={e => e.stopPropagation()}>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(member, f); e.target.value = "" }} />
                    {member.user.image ? (
                      <img src={member.user.image} alt={member.user.name || ""} className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: member.color }}>
                        {member.user.name?.[0] || "?"}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                      {uploadingId === member.id
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Camera className="w-4 h-4 text-white" />}
                    </div>
                  </label>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{member.user.name}</p>
                    {member.specialty && <p className="text-xs text-muted-foreground truncate">{member.specialty}</p>}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /><span className="truncate">{member.user.email}</span></div>
                  {member.user.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{member.user.phone}</div>}
                </div>
                <div className="flex gap-1 mt-3 flex-wrap">
                  {member.schedules.filter(s => s.isWorking).map(s => (
                    <Badge key={s.dayOfWeek} variant="secondary" className="text-xs px-1.5">{DAYS[s.dayOfWeek]}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Agregar profesional</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Especialidad</Label><Input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1.5">
                <Label>Color en el calendario</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "scale-125 ring-2 ring-offset-2 ring-primary" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreate} disabled={saving || !form.name || !form.email}>
                {saving ? "Guardando..." : "Agregar"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff detail sheet */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="px-5 pt-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <label className="relative w-9 h-9 flex-shrink-0 cursor-pointer group/photo">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(selected, f); e.target.value = "" }} />
                  {selected.user.image ? (
                    <img src={selected.user.image} alt={selected.user.name || ""} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base" style={{ backgroundColor: selected.color }}>
                      {selected.user.name?.[0] || "?"}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                    {uploadingId === selected.id
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Camera className="w-3 h-3 text-white" />}
                  </div>
                </label>
                <div>
                  <DialogTitle className="text-sm">{selected.user.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground">{selected.specialty || "Sin especialidad"}</p>
                </div>
              </div>
            </DialogHeader>
            <Tabs defaultValue="schedule">
              <TabsList className="w-full rounded-none border-b border-white/10 bg-transparent h-9">
                <TabsTrigger value="schedule" className="flex-1 text-xs h-full rounded-none">Horarios</TabsTrigger>
                <TabsTrigger value="services" className="flex-1 text-xs h-full rounded-none">Servicios</TabsTrigger>
                <TabsTrigger value="exceptions" className="flex-1 text-xs h-full rounded-none">Excepciones</TabsTrigger>
                <TabsTrigger value="info" className="flex-1 text-xs h-full rounded-none">Info</TabsTrigger>
              </TabsList>
              <div className="px-5 pb-5 pt-3">
                <TabsContent value="schedule" className="mt-0">
                  <ScheduleEditor schedules={selected.schedules} onSave={s => updateSchedule(selected.id, s)} />
                </TabsContent>
                <TabsContent value="services" className="mt-0">
                  <ServicesEditor businessId={businessId} staffId={selected.id} assignedIds={selected.services.map(s => s.id)} onSaved={() => loadStaff(businessId)} />
                </TabsContent>
                <TabsContent value="exceptions" className="mt-0">
                  <ExceptionsEditor businessId={businessId} staffId={selected.id} />
                </TabsContent>
                <TabsContent value="info" className="mt-0">
                  <InfoEditor key={selected.id} member={selected} businessId={businessId} onSaved={() => loadStaff(businessId)} />
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

type Exception = {
  id: string; date: string; endDate: string | null; startTime: string | null; endTime: string | null
  type: "BLOCKED" | "CAPACITY_OVERRIDE"; capacity: number | null; reason: string | null
}

function ExceptionsEditor({ businessId, staffId }: { businessId: string; staffId: string }) {
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    date: "", endDate: "", startTime: "", endTime: "", type: "BLOCKED" as "BLOCKED" | "CAPACITY_OVERRIDE",
    capacity: 1, reason: "", fullDay: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [staffId])

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/businesses/${businessId}/staff/${staffId}/exceptions`)
    if (r.ok) { const d = await r.json(); setExceptions(d.exceptions || []) }
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.date) { toast.error("Selecciona una fecha"); return }
    if (form.type === "CAPACITY_OVERRIDE" && form.capacity < 1) { toast.error("Capacidad debe ser al menos 1"); return }
    setSaving(true)
    const body = {
      date: form.date,
      endDate: form.endDate || undefined,
      startTime: form.fullDay ? undefined : form.startTime || undefined,
      endTime: form.fullDay ? undefined : form.endTime || undefined,
      type: form.type,
      capacity: form.type === "CAPACITY_OVERRIDE" ? form.capacity : undefined,
      reason: form.reason || undefined,
    }
    const r = await fetch(`/api/businesses/${businessId}/staff/${staffId}/exceptions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      toast.success("Excepción agregada")
      setForm({ date: "", endDate: "", startTime: "", endTime: "", type: "BLOCKED", capacity: 1, reason: "", fullDay: true })
      load()
    } else toast.error("Error al guardar")
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/businesses/${businessId}/staff/${staffId}/exceptions/${id}`, { method: "DELETE" })
    toast.success("Excepción eliminada")
    load()
  }

  const inputCls = "w-full h-7 rounded-md border border-input px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
  const inputStyle = { backgroundColor: "#3a3a3c", color: "#f4f4f5" }

  return (
    <div className="space-y-3">
      {/* Form */}
      <div className="rounded-lg border border-white/10 p-3 space-y-2">
        <p className="text-xs font-medium">Nueva excepción</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Desde *</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Hasta (opcional)</label>
            <input type="date" value={form.endDate} min={form.date || undefined}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">Tipo</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof form.type }))}
              className={inputCls} style={inputStyle}>
              <option value="BLOCKED">Bloquear</option>
              <option value="CAPACITY_OVERRIDE">Reducir capacidad</option>
            </select>
          </div>
          <div className="flex items-end pb-0.5">
            <button onClick={() => setForm(f => ({ ...f, fullDay: !f.fullDay }))}
              className="flex items-center gap-1.5 text-xs">
              <div className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${form.fullDay ? "bg-primary" : "bg-muted-foreground/30"}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${form.fullDay ? "left-[18px]" : "left-0.5"}`} />
              </div>
              Todo el día
            </button>
          </div>
        </div>

        {!form.fullDay && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Hora inicio</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Hora fin</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {form.type === "CAPACITY_OVERRIDE" && (
            <div>
              <label className="text-[10px] text-muted-foreground">Capacidad</label>
              <input type="number" min={1} max={20} value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: Math.max(1, +e.target.value) }))}
                className={inputCls} style={inputStyle} />
            </div>
          )}
          <div className={form.type === "CAPACITY_OVERRIDE" ? "" : "col-span-2"}>
            <label className="text-[10px] text-muted-foreground">Motivo (opcional)</label>
            <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Vacaciones, capacitación..."
              className={inputCls} style={inputStyle} />
          </div>
        </div>

        <button onClick={handleAdd} disabled={saving}
          className="w-full h-7 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Guardando..." : "Agregar excepción"}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="h-10 bg-muted/20 animate-pulse rounded-lg" />
      ) : exceptions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Sin excepciones configuradas</p>
      ) : (
        <div className="space-y-1">
          {exceptions.map(ex => (
            <div key={ex.id} className="flex items-center gap-2 p-2 rounded-lg border border-white/8 bg-white/3">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${ex.type === "BLOCKED" ? "bg-red-500/15" : "bg-amber-500/15"}`}>
                {ex.type === "BLOCKED" ? <Ban className="w-3 h-3 text-red-400" /> : <Users className="w-3 h-3 text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight">
                  {new Date(ex.date).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                  {ex.endDate && ex.endDate !== ex.date && (
                    <span> → {new Date(ex.endDate).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</span>
                  )}
                  {ex.startTime && ex.endTime && <span className="text-muted-foreground"> {ex.startTime}–{ex.endTime}</span>}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {ex.type === "BLOCKED" ? "Bloqueado" : `Cap. ${ex.capacity}`}
                  {ex.reason && ` · ${ex.reason}`}
                </p>
              </div>
              <button onClick={() => handleDelete(ex.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-0.5">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoEditor({ member, businessId, onSaved }: { member: StaffMember; businessId: string; onSaved: () => void }) {
  const [form, setForm] = useState({
    specialty: member.specialty || "",
    bio: member.bio || "",
    commissionType: member.commissionType || "PERCENTAGE",
    commissionValue: member.commissionValue ?? 0,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, commissionValue: Number(form.commissionValue) }),
    })
    if (r.ok) { toast.success("Datos actualizados"); onSaved() }
    else toast.error("Error al guardar")
    setSaving(false)
  }

  const inputCls = "w-full h-8 rounded-md border border-input px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
  const inputStyle = { backgroundColor: "#3a3a3c", color: "#f4f4f5" }

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <div><p className="text-muted-foreground mb-0.5">Email</p><p>{member.user.email}</p></div>
        <div><p className="text-muted-foreground mb-0.5">Teléfono</p><p>{member.user.phone || "—"}</p></div>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground">Especialidad</label>
        <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
          className={inputCls} style={inputStyle} placeholder="Kinesiología, Masajes..." />
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground">Bio</label>
        <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          rows={2} className="w-full rounded-md border border-input px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          style={inputStyle} placeholder="Descripción del profesional..." />
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground">Comisión</label>
        <div className="flex gap-2">
          <select value={form.commissionType} onChange={e => setForm(f => ({ ...f, commissionType: e.target.value }))}
            className={inputCls} style={{ ...inputStyle, width: "auto", flex: "0 0 auto" }}>
            <option value="PERCENTAGE">%</option>
            <option value="FIXED">Fijo $</option>
          </select>
          <input type="text" inputMode="numeric" pattern="[0-9]*"
            value={form.commissionValue === 0 ? "" : String(form.commissionValue)}
            onBlur={e => { if (!e.target.value) setForm(f => ({ ...f, commissionValue: 0 })) }}
            onChange={e => { const v = e.target.value.replace(/\D/g, ""); setForm(f => ({ ...f, commissionValue: v === "" ? 0 : parseInt(v, 10) })) }}
            className={inputCls} style={inputStyle} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {form.commissionType === "PERCENTAGE" ? `${form.commissionValue}% del valor del servicio` : `$${Number(form.commissionValue).toLocaleString("es-CL")} por servicio`}
        </p>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  )
}

function ScheduleEditor({ schedules, onSave }: { schedules: Schedule[]; onSave: (s: Schedule[]) => void }) {
  const [local, setLocal] = useState<Schedule[]>(() => {
    const base = Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, startTime: "09:00", endTime: "18:00", isWorking: i >= 1 && i <= 5 }))
    return base.map(b => schedules.find(s => s.dayOfWeek === b.dayOfWeek) || b)
  })

  function toggle(day: number) {
    setLocal(l => l.map(s => s.dayOfWeek === day ? { ...s, isWorking: !s.isWorking } : s))
  }

  function updateTime(day: number, field: "startTime" | "endTime", value: string) {
    setLocal(l => l.map(s => s.dayOfWeek === day ? { ...s, [field]: value } : s))
  }

  return (
    <div className="space-y-1">
      {local.map(s => (
        <div key={s.dayOfWeek} className={`flex items-center gap-2 py-1.5 px-2 rounded-md border transition-colors ${s.isWorking ? "bg-card" : "bg-muted/30 opacity-60"}`}>
          <button onClick={() => toggle(s.dayOfWeek)} className={`w-8 h-4.5 rounded-full transition-colors flex-shrink-0 relative ${s.isWorking ? "bg-primary" : "bg-muted-foreground/30"}`}
            style={{ width: 32, height: 18 }}>
            <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${s.isWorking ? "left-[14px]" : "left-0.5"}`} />
          </button>
          <span className="w-7 text-xs font-medium">{DAYS[s.dayOfWeek]}</span>
          {s.isWorking ? (
            <div className="flex items-center gap-1.5 flex-1">
              <Input type="time" value={s.startTime} onChange={e => updateTime(s.dayOfWeek, "startTime", e.target.value)} className="h-7 text-xs px-2 w-24" />
              <span className="text-muted-foreground text-xs">–</span>
              <Input type="time" value={s.endTime} onChange={e => updateTime(s.dayOfWeek, "endTime", e.target.value)} className="h-7 text-xs px-2 w-24" />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground flex-1">No trabaja</span>
          )}
        </div>
      ))}
      <Button className="w-full h-8 text-xs mt-2" onClick={() => onSave(local)}>Guardar horarios</Button>
    </div>
  )
}

