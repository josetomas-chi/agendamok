"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Plus, MapPin, Phone, Clock, Pencil, Trash2, ChevronRight,
  ArrowLeft, Users, Scissors, ToggleLeft, ToggleRight, Check, Star,
} from "lucide-react"

type Location = {
  id: string
  name: string
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  timezone: string | null
  isDefault: boolean
  isActive: boolean
}

type StaffMember = {
  id: string
  color: string
  user: { name: string | null; image: string | null }
}

type Service = {
  id: string
  name: string
  color: string
  price: number
  duration: number
}

type LocationForm = {
  name: string; address: string; city: string; country: string; phone: string; timezone: string
}

const DEFAULT_FORM: LocationForm = {
  name: "", address: "", city: "", country: "", phone: "", timezone: "America/Santiago",
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const [selected, setSelected] = useState<Location | null>(null)
  const [tab, setTab] = useState<"staff" | "services">("staff")
  const [allStaff, setAllStaff] = useState<StaffMember[]>([])
  const [assignedStaff, setAssignedStaff] = useState<StaffMember[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [assignedServices, setAssignedServices] = useState<Service[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(d => {
      setBusinessId(d.businessId)
      loadLocations(d.businessId)
    })
  }, [])

  async function loadLocations(bid: string) {
    setLoading(true)
    const r = await fetch(`/api/businesses/${bid}/locations`)
    const d = await r.json()
    setLocations(d.locations || [])
    setLoading(false)
  }

  const loadDetail = useCallback(async (bid: string, loc: Location) => {
    setLoadingDetail(true)
    const [sRes, svRes] = await Promise.all([
      fetch(`/api/businesses/${bid}/locations/${loc.id}/staff`),
      fetch(`/api/businesses/${bid}/locations/${loc.id}/services`),
    ])
    const [sData, svData] = await Promise.all([sRes.json(), svRes.json()])
    setAllStaff(sData.all || [])
    setAssignedStaff(sData.assigned || [])
    setAllServices(svData.all || [])
    setAssignedServices(svData.assigned || [])
    setLoadingDetail(false)
  }, [])

  function openLocation(loc: Location) {
    setSelected(loc)
    setTab("staff")
    loadDetail(businessId, loc)
  }

  function openNew() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setOpen(true)
  }

  function openEdit(loc: Location, e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(loc)
    setForm({
      name: loc.name,
      address: loc.address || "",
      city: loc.city || "",
      country: loc.country || "",
      phone: loc.phone || "",
      timezone: loc.timezone || "America/Santiago",
    })
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const url = editing
      ? `/api/businesses/${businessId}/locations/${editing.id}`
      : `/api/businesses/${businessId}/locations`
    const method = editing ? "PATCH" : "POST"
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (r.ok) {
      toast.success(editing ? "Sede actualizada" : "Sede creada")
      setOpen(false)
      loadLocations(businessId)
    } else {
      toast.error("Error al guardar")
    }
    setSaving(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("Eliminar esta sede?")) return
    await fetch(`/api/businesses/${businessId}/locations/${id}`, { method: "DELETE" })
    toast.success("Sede eliminada")
    if (selected?.id === id) setSelected(null)
    loadLocations(businessId)
  }

  async function toggleActive(loc: Location, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/businesses/${businessId}/locations/${loc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !loc.isActive }),
    })
    loadLocations(businessId)
  }

  async function setDefault(loc: Location, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/businesses/${businessId}/locations/${loc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    })
    loadLocations(businessId)
    toast.success(`"${loc.name}" es ahora la sede principal`)
  }

  async function toggleStaff(staffId: string) {
    if (!selected) return
    const isAssigned = assignedStaff.some(s => s.id === staffId)
    const newIds = isAssigned
      ? assignedStaff.filter(s => s.id !== staffId).map(s => s.id)
      : [...assignedStaff.map(s => s.id), staffId]
    await fetch(`/api/businesses/${businessId}/locations/${selected.id}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffIds: newIds }),
    })
    loadDetail(businessId, selected)
  }

  async function toggleService(serviceId: string) {
    if (!selected) return
    const isAssigned = assignedServices.some(s => s.id === serviceId)
    const newIds = isAssigned
      ? assignedServices.filter(s => s.id !== serviceId).map(s => s.id)
      : [...assignedServices.map(s => s.id), serviceId]
    await fetch(`/api/businesses/${businessId}/locations/${selected.id}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds: newIds }),
    })
    loadDetail(businessId, selected)
  }

  if (selected) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="page-title">{selected.name}</h1>
              <p className="page-subtitle">
                {[selected.address, selected.city, selected.country].filter(Boolean).join(", ") || "Sin direccion"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {selected.isDefault ? (
              <Badge variant="secondary" className="gap-1 text-xs"><Star className="w-3 h-3" /> Sede principal</Badge>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={e => setDefault(selected, e)}>
                <Star className="w-3.5 h-3.5" /> Marcar como principal
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={e => openEdit(selected, e)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-white/10">
          {(["staff", "services"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t ? "border-sky-400 text-sky-300" : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {t === "staff" ? (
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Staff ({assignedStaff.length})</span>
              ) : (
                <span className="flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5" /> Servicios ({assignedServices.length})</span>
              )}
            </button>
          ))}
        </div>

        {loadingDetail ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : tab === "staff" ? (
          <div>
            <p className="text-sm text-white/40 mb-3">Selecciona que staff trabaja en esta sede</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allStaff.map(s => {
                const assigned = assignedStaff.some(a => a.id === s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleStaff(s.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      assigned ? "border-sky-500/40 bg-sky-500/10" : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                      style={{ backgroundColor: s.color + "40", border: `2px solid ${s.color}` }}
                    >
                      {s.user.name?.[0] ?? "?"}
                    </div>
                    <span className="text-sm font-medium flex-1">{s.user.name}</span>
                    {assigned && <Check className="w-4 h-4 text-sky-400" />}
                  </button>
                )
              })}
              {allStaff.length === 0 && (
                <p className="col-span-2 text-sm text-white/30 py-6 text-center">No hay staff registrado</p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-white/40 mb-3">Selecciona que servicios se ofrecen en esta sede</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allServices.map(sv => {
                const assigned = assignedServices.some(a => a.id === sv.id)
                return (
                  <button
                    key={sv.id}
                    onClick={() => toggleService(sv.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      assigned ? "border-sky-500/40 bg-sky-500/10" : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: sv.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sv.name}</p>
                      <p className="text-xs text-white/40">{sv.duration} min</p>
                    </div>
                    {assigned && <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />}
                  </button>
                )
              })}
              {allServices.length === 0 && (
                <p className="col-span-2 text-sm text-white/30 py-6 text-center">No hay servicios registrados</p>
              )}
            </div>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Editar sede</DialogTitle></DialogHeader>
            <LocationForm form={form} setForm={setForm} saving={saving} onSave={handleSave} onCancel={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sedes</h1>
          <p className="page-subtitle">Gestiona las ubicaciones de tu negocio</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva sede
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-44 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-7 h-7" />
          </div>
          <p className="font-medium">No hay sedes registradas</p>
          <p className="text-sm mt-1">Crea tu primera sede para organizar tu negocio</p>
          <Button className="mt-4" onClick={openNew}>Crear sede</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div
              key={loc.id}
              onClick={() => openLocation(loc)}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] overflow-hidden transition-all cursor-pointer"
            >
              <div className={`h-1 w-full ${loc.isDefault ? "bg-sky-400" : "bg-primary/40"}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{loc.name}</h3>
                      <div className="flex gap-1 mt-0.5">
                        {loc.isDefault && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Principal</Badge>}
                        {!loc.isActive && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-white/30">Inactiva</Badge>}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors mt-1" />
                </div>

                {(loc.address || loc.city) && (
                  <p className="text-xs text-white/50 mb-2">
                    {[loc.address, loc.city, loc.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {loc.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
                    <Phone className="w-3 h-3" /> {loc.phone}
                  </div>
                )}
                {loc.timezone && (
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Clock className="w-3 h-3" /> {loc.timezone}
                  </div>
                )}

                <div className="flex gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => toggleActive(loc, e)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      loc.isActive
                        ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                        : "bg-white/10 text-white/40 hover:bg-white/15"
                    }`}
                  >
                    {loc.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    {loc.isActive ? "Activa" : "Inactiva"}
                  </button>
                  <button
                    onClick={e => openEdit(loc, e)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/40 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => handleDelete(loc.id, e)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar sede" : "Nueva sede"}</DialogTitle>
          </DialogHeader>
          <LocationForm form={form} setForm={setForm} saving={saving} onSave={handleSave} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LocationForm({
  form, setForm, saving, onSave, onCancel,
}: {
  form: LocationForm
  setForm: React.Dispatch<React.SetStateAction<LocationForm>>
  saving: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Nombre *</Label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Sucursal Centro" />
      </div>
      <div className="space-y-1.5">
        <Label>Direccion</Label>
        <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Av. Principal 123" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Ciudad</Label>
          <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Santiago" />
        </div>
        <div className="space-y-1.5">
          <Label>Pais</Label>
          <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Chile" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Telefono</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+56 9 1234 5678" />
        </div>
        <div className="space-y-1.5">
          <Label>Zona horaria</Label>
          <Input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="America/Santiago" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={onSave} disabled={saving || !form.name}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}
