"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Clock, DollarSign, Circle, Power } from "lucide-react"
import { cn } from "@/lib/utils"

type Category = { id: string; name: string; order: number }
type Service = {
  id: string; name: string; description: string | null; duration: number
  price: number; color: string; isActive: boolean; category: Category | null
  bufferAfter: number; requiresDeposit: boolean; deposit: number | null
  capacity: number
}

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#0ea5e9","#64748b"]

const DEFAULT_FORM = { name: "", description: "", duration: 60, price: 0, color: "#6366f1", categoryId: "", bufferAfter: 0, requiresDeposit: false, deposit: 0, isActive: true, capacity: 1 }

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState<typeof DEFAULT_FORM & { categoryId: string | null }>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [catInput, setCatInput] = useState("")

  useEffect(() => {
    fetch("/api/me/business")
      .then(r => r.json())
      .then(d => {
        if (!d.businessId) { setLoading(false); return }
        setBusinessId(d.businessId)
        loadServices(d.businessId)
      })
      .catch(() => setLoading(false))
  }, [])

  async function loadServices(bid: string) {
    setLoading(true)
    try {
      const r = await fetch(`/api/businesses/${bid}/services`)
      const d = await r.json()
      setServices(d.services || [])
      setCategories(d.categories || [])
    } catch {
      toast.error("Error al cargar los servicios")
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setForm({
      name: s.name, description: s.description || "", duration: s.duration,
      price: s.price, color: s.color, categoryId: s.category?.id || "",
      bufferAfter: s.bufferAfter, requiresDeposit: s.requiresDeposit,
      deposit: s.deposit || 0, isActive: s.isActive, capacity: s.capacity ?? 1,
    })
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    const url = editing
      ? `/api/businesses/${businessId}/services/${editing.id}`
      : `/api/businesses/${businessId}/services`
    const method = editing ? "PATCH" : "POST"
    const r = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price), duration: Number(form.duration), bufferAfter: Number(form.bufferAfter), deposit: Number(form.deposit), capacity: Number(form.capacity), categoryId: form.categoryId || null }),
    })
    if (r.ok) {
      toast.success(editing ? "Servicio actualizado" : "Servicio creado")
      setOpen(false)
      loadServices(businessId)
    } else {
      toast.error("Error al guardar")
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este servicio?")) return
    await fetch(`/api/businesses/${businessId}/services/${id}`, { method: "DELETE" })
    toast.success("Servicio eliminado")
    loadServices(businessId)
  }

  async function toggleActive(s: Service) {
    await fetch(`/api/businesses/${businessId}/services/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    })
    loadServices(businessId)
  }

  async function addCategory() {
    if (!catInput.trim()) return
    await fetch(`/api/businesses/${businessId}/categories`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catInput }),
    })
    setCatInput("")
    loadServices(businessId)
  }

  const grouped = categories.reduce((acc, cat) => {
    acc[cat.id] = { cat, items: services.filter(s => s.category?.id === cat.id) }
    return acc
  }, {} as Record<string, { cat: Category; items: Service[] }>)
  const uncategorized = services.filter(s => !s.category)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Servicios</h1>
          <p className="page-subtitle">Gestiona los servicios que ofreces</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo servicio
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-7 h-7" />
          </div>
          <p className="font-medium">Todavía no hay servicios</p>
          <p className="text-sm mt-1">Crea tu primer servicio para empezar a recibir citas</p>
          <Button className="mt-4" onClick={openNew}>Crear servicio</Button>
        </div>
      ) : (
        <ServiceGrid items={services} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />
      )}

      {/* Categories quick-add */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-2">Categorías</p>
        <div className="flex gap-2 flex-wrap mb-2">
          {categories.map(c => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Nueva categoría" value={catInput} onChange={e => setCatInput(e.target.value)} className="max-w-xs" onKeyDown={e => e.key === "Enter" && addCategory()} />
          <Button variant="outline" size="sm" onClick={addCategory}>Agregar</Button>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Corte de cabello" />
              </div>
              <div className="space-y-2">
                <Label>Duración (min) *</Label>
                <Input type="number" value={form.duration || ""} onChange={e => setForm(f => ({ ...f, duration: e.target.value === "" ? 0 : +e.target.value }))} min={5} step={5} placeholder="60" />
              </div>
              <div className="space-y-2">
                <Label>Precio *</Label>
                <Input type="number" value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: e.target.value === "" ? 0 : +e.target.value }))} min={0} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Tiempo entre sesiones (min)</Label>
                <Input type="number" value={form.bufferAfter} onChange={e => setForm(f => ({ ...f, bufferAfter: +e.target.value }))} min={0} step={5} />
              </div>
              <div className="space-y-2">
                <Label>Capacidad simultánea</Label>
                <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Math.max(1, +e.target.value) }))} min={1} max={20} />
                <p className="text-xs text-muted-foreground">Personas que pueden reservar este servicio al mismo tiempo</p>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select
                  value={form.categoryId ?? ""}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}
                >
                  <option value="" style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}>Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id} style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={cn("w-7 h-7 rounded-full transition-transform", form.color === c && "scale-125 ring-2 ring-offset-2 ring-primary")}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
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

function ServiceGrid({ items, onEdit, onDelete, onToggle }: {
  items: Service[]
  onEdit: (s: Service) => void
  onDelete: (id: string) => void
  onToggle: (s: Service) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(s => (
        <Card key={s.id} className={cn("group relative overflow-hidden transition-all hover:shadow-md", !s.isActive && "opacity-60")}>
          <div className="h-1 w-full" style={{ backgroundColor: s.color }} />
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Circle className="w-3 h-3 flex-shrink-0" fill={s.color} color={s.color} />
                <h3 className="font-semibold truncate">{s.name}</h3>
              </div>
              {!s.isActive && <Badge variant="secondary" className="text-xs flex-shrink-0">Inactivo</Badge>}
            </div>
            {s.category && <p className="text-xs text-muted-foreground mb-1">{s.category.name}</p>}
            {s.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{s.description}</p>}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration} min</span>
              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${Number(s.price).toLocaleString("es-AR")}</span>
            </div>
            <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onEdit(s)}><Pencil className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onToggle(s)}><Power className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => onDelete(s.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


