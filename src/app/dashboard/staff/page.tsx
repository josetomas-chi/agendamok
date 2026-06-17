"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, Clock, Mail, Phone, Camera } from "lucide-react"

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

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(d => {
      setBusinessId(d.businessId)
      loadStaff(d.businessId)
    })
  }, [])

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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <label className="relative w-12 h-12 flex-shrink-0 cursor-pointer group/photo">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(selected, f); e.target.value = "" }} />
                  {selected.user.image ? (
                    <img src={selected.user.image} alt={selected.user.name || ""} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: selected.color }}>
                      {selected.user.name?.[0] || "?"}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                    {uploadingId === selected.id
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Camera className="w-4 h-4 text-white" />}
                  </div>
                </label>
                <div>
                  <DialogTitle>{selected.user.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{selected.specialty || "Sin especialidad"}</p>
                </div>
              </div>
            </DialogHeader>
            <Tabs defaultValue="schedule">
              <TabsList className="w-full">
                <TabsTrigger value="schedule" className="flex-1">Horarios</TabsTrigger>
                <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
              </TabsList>
              <TabsContent value="schedule" className="pt-4">
                <ScheduleEditor schedules={selected.schedules} onSave={s => updateSchedule(selected.id, s)} />
              </TabsContent>
              <TabsContent value="info" className="pt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-muted-foreground text-xs mb-1">Email</p><p>{selected.user.email}</p></div>
                  <div><p className="text-muted-foreground text-xs mb-1">Teléfono</p><p>{selected.user.phone || "—"}</p></div>
                  <div><p className="text-muted-foreground text-xs mb-1">Comisión</p><p>{selected.commissionValue}{selected.commissionType === "PERCENTAGE" ? "%" : " (fijo)"}</p></div>
                </div>
                {selected.bio && <div><p className="text-muted-foreground text-xs mb-1">Bio</p><p>{selected.bio}</p></div>}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
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
    <div className="space-y-2">
      {local.map(s => (
        <div key={s.dayOfWeek} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${s.isWorking ? "bg-card" : "bg-muted/50 opacity-60"}`}>
          <button onClick={() => toggle(s.dayOfWeek)} className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${s.isWorking ? "bg-primary" : "bg-muted-foreground/30"}`}>
            <div className={`w-4 h-4 rounded-full bg-white mx-auto transition-transform ${s.isWorking ? "translate-x-2" : "-translate-x-2"}`} />
          </button>
          <span className="w-8 text-sm font-medium">{DAYS[s.dayOfWeek]}</span>
          {s.isWorking ? (
            <div className="flex items-center gap-2 flex-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <Input type="time" value={s.startTime} onChange={e => updateTime(s.dayOfWeek, "startTime", e.target.value)} className="h-8 w-28" />
              <span className="text-muted-foreground text-sm">—</span>
              <Input type="time" value={s.endTime} onChange={e => updateTime(s.dayOfWeek, "endTime", e.target.value)} className="h-8 w-28" />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground flex-1">No trabaja</span>
          )}
        </div>
      ))}
      <Button className="w-full mt-2" onClick={() => onSave(local)}>Guardar horarios</Button>
    </div>
  )
}

