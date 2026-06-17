"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, MapPin, Phone, Clock, Pencil, Trash2 } from "lucide-react"

type Location = {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  timezone: string
  isActive: boolean
}

const DEFAULT_FORM = { name: "", address: "", city: "", phone: "", timezone: "America/Santiago" }

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

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

  function openNew() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setOpen(true)
  }

  function openEdit(loc: Location) {
    setEditing(loc)
    setForm({
      name: loc.name,
      address: loc.address || "",
      city: loc.city || "",
      phone: loc.phone || "",
      timezone: loc.timezone,
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

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta sede?")) return
    await fetch(`/api/businesses/${businessId}/locations/${id}`, { method: "DELETE" })
    toast.success("Sede eliminada")
    loadLocations(businessId)
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
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-7 h-7" />
          </div>
          <p className="font-medium">No hay sedes registradas</p>
          <p className="text-sm mt-1">Crea tu primera sede para organizar tu negocio por ubicacion</p>
          <Button className="mt-4" onClick={openNew}>Crear sede</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <Card key={loc.id} className="group relative overflow-hidden hover:shadow-md transition-all">
              <div className="h-1 w-full bg-primary" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{loc.name}</h3>
                      {!loc.isActive && <Badge variant="secondary" className="text-xs">Inactiva</Badge>}
                    </div>
                  </div>
                </div>
                {(loc.address || loc.city) && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {[loc.address, loc.city].filter(Boolean).join(", ")}
                  </p>
                )}
                {loc.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    {loc.phone}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {loc.timezone}
                </div>
                <div className="flex gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(loc)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(loc.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar sede" : "Nueva sede"}</DialogTitle>
          </DialogHeader>
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
                <Label>Telefono</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+56 9 1234 5678" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Zona horaria</Label>
              <Input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="America/Santiago" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
