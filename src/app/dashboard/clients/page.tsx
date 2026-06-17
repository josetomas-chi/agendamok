"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, Search, Mail, Phone, Calendar, DollarSign, Tag } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Client = {
  id: string; name: string; email: string | null; phone: string | null
  notes: string | null; tags: string[]; segment: string; loyaltyPoints: number
  createdAt: string
  _count: { appointments: number }
  appointments: { payment: { amount: number } | null }[]
}

const SEGMENT_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Nuevo", color: "bg-blue-100 text-blue-700" },
  REGULAR: { label: "Regular", color: "bg-gray-100 text-gray-700" },
  FREQUENT: { label: "Frecuente", color: "bg-green-100 text-green-700" },
  VIP: { label: "VIP", color: "bg-purple-100 text-purple-700" },
  AT_RISK: { label: "En riesgo", color: "bg-orange-100 text-orange-700" },
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [segment, setSegment] = useState("")
  const [selected, setSelected] = useState<Client | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(d => {
      setBusinessId(d.businessId)
      loadClients(d.businessId, "", "")
    })
  }, [])

  const loadClients = useCallback(async (bid: string, q: string, seg: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("search", q)
    if (seg) params.set("segment", seg)
    const r = await fetch(`/api/businesses/${bid}/clients?${params}`)
    const d = await r.json()
    setClients(d.clients || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!businessId) return
    const t = setTimeout(() => loadClients(businessId, search, segment), 300)
    return () => clearTimeout(t)
  }, [search, segment, businessId, loadClients])

  async function handleCreate() {
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/clients`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (r.ok) {
      toast.success("Cliente agregado")
      setOpen(false)
      setForm({ name: "", email: "", phone: "", notes: "" })
      loadClients(businessId, search, segment)
    } else toast.error("Error al guardar")
    setSaving(false)
  }

  const totalSpend = (c: Client) => c.appointments.reduce((sum, a) => sum + (a.payment ? Number(a.payment.amount) : 0), 0)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clients.length} clientes en total</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nuevo cliente</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nombre, email o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["", "VIP", "FREQUENT", "AT_RISK", "NEW"].map(s => (
            <button key={s} onClick={() => setSegment(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${segment === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
              {s === "" ? "Todos" : SEGMENT_LABELS[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium">No se encontraron clientes</p>
          <p className="text-sm mt-1">{search ? "Probá con otra búsqueda" : "Los clientes aparecen cuando reservan un turno"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 px-4 py-2.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Cliente</span><span>Turnos</span><span>Gasto total</span><span>Segmento</span><span></span>
          </div>
          {clients.map(c => (
            <div key={c.id} className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 px-4 py-3.5 border-b last:border-0 items-center hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {c.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                  </div>
                </div>
              </div>
              <span className="text-sm font-medium text-center">{c._count.appointments}</span>
              <span className="text-sm font-medium text-center">${totalSpend(c).toLocaleString("es-AR")}</span>
              <span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENT_LABELS[c.segment]?.color}`}>
                  {SEGMENT_LABELS[c.segment]?.label}
                </span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setSelected(c)}>Ver</Button>
            </div>
          ))}
        </div>
      )}

      {/* New client dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5"><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleCreate} disabled={saving || !form.name}>{saving ? "Guardando..." : "Guardar"}</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client detail dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {selected.name[0].toUpperCase()}
                </div>
                <div>
                  <DialogTitle>{selected.name}</DialogTitle>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENT_LABELS[selected.segment]?.color}`}>
                    {SEGMENT_LABELS[selected.segment]?.label}
                  </span>
                </div>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{selected._count.appointments}</p>
                <p className="text-xs text-muted-foreground mt-1">Turnos</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">${totalSpend(selected).toLocaleString("es-AR")}</p>
                <p className="text-xs text-muted-foreground mt-1">Gasto total</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{selected.loyaltyPoints}</p>
                <p className="text-xs text-muted-foreground mt-1">Puntos</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {selected.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{selected.email}</div>}
              {selected.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{selected.phone}</div>}
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" />Cliente desde {format(new Date(selected.createdAt), "MMMM yyyy", { locale: es })}</div>
            </div>
            {selected.notes && (
              <div className="bg-muted/30 rounded-lg p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
                <p>{selected.notes}</p>
              </div>
            )}
            {selected.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {selected.tags.map(t => <Badge key={t} variant="secondary" className="gap-1"><Tag className="w-3 h-3" />{t}</Badge>)}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
