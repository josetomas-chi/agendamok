"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Plus, FileText, Pencil, Trash2, ChevronRight, ArrowLeft,
  Send, Check, X, Clock, User, Hash, Percent, Package, ChevronDown,
} from "lucide-react"

type QuoteItem = {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  serviceId?: string
}

type Quote = {
  id: string
  number: number
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"
  validUntil: string | null
  notes: string | null
  discount: number
  createdAt: string
  client: { id: string; name: string; email: string } | null
  items: QuoteItem[]
}

type Client = { id: string; name: string }
type Service = { id: string; name: string; price: number; duration: number }

const STATUS_LABELS: Record<Quote["status"], string> = {
  DRAFT: "Borrador", SENT: "Enviado", ACCEPTED: "Aceptado", REJECTED: "Rechazado", EXPIRED: "Vencido",
}
const STATUS_COLORS: Record<Quote["status"], string> = {
  DRAFT: "bg-white/10 text-white/50",
  SENT: "bg-sky-500/20 text-sky-300",
  ACCEPTED: "bg-green-500/20 text-green-400",
  REJECTED: "bg-red-500/20 text-red-400",
  EXPIRED: "bg-orange-500/20 text-orange-400",
}

function calcTotal(items: QuoteItem[], discount: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  return subtotal - (subtotal * discount) / 100
}

const EMPTY_ITEM: QuoteItem = { description: "", quantity: 1, unitPrice: 0 }

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [selected, setSelected] = useState<Quote | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Quote | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    clientId: "", notes: "", discount: 0, validUntil: "",
    items: [{ ...EMPTY_ITEM }] as QuoteItem[],
  })

  const load = useCallback(async (bid: string) => {
    setLoading(true)
    const r = await fetch(`/api/businesses/${bid}/quotes`)
    const d = await r.json()
    setQuotes(d.quotes || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(async d => {
      setBusinessId(d.businessId)
      load(d.businessId)
      const [cr, sr] = await Promise.all([
        fetch(`/api/businesses/${d.businessId}/clients`),
        fetch(`/api/businesses/${d.businessId}/services`),
      ])
      const [cd, sd] = await Promise.all([cr.json(), sr.json()])
      setClients(cd.clients || [])
      setServices(sd.services || [])
    })
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({ clientId: "", notes: "", discount: 0, validUntil: "", items: [{ ...EMPTY_ITEM }] })
    setOpen(true)
  }

  function openEdit(q: Quote, e?: React.MouseEvent) {
    e?.stopPropagation()
    setEditing(q)
    setForm({
      clientId: q.client?.id || "",
      notes: q.notes || "",
      discount: q.discount,
      validUntil: q.validUntil ? q.validUntil.split("T")[0] : "",
      items: q.items.length > 0 ? q.items.map(i => ({ ...i })) : [{ ...EMPTY_ITEM }],
    })
    setOpen(true)
  }

  async function handleSave() {
    const validItems = form.items.filter(i => i.description.trim())
    if (validItems.length === 0) { toast.error("Agrega al menos un ítem"); return }
    setSaving(true)
    const url = editing
      ? `/api/businesses/${businessId}/quotes/${editing.id}`
      : `/api/businesses/${businessId}/quotes`
    const method = editing ? "PATCH" : "POST"
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items: validItems }),
    })
    if (r.ok) {
      toast.success(editing ? "Presupuesto actualizado" : "Presupuesto creado")
      setOpen(false)
      load(businessId)
    } else toast.error("Error al guardar")
    setSaving(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("Eliminar este presupuesto?")) return
    await fetch(`/api/businesses/${businessId}/quotes/${id}`, { method: "DELETE" })
    toast.success("Eliminado")
    if (selected?.id === id) setSelected(null)
    load(businessId)
  }

  async function changeStatus(q: Quote, status: Quote["status"]) {
    const r = await fetch(`/api/businesses/${businessId}/quotes/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (r.ok) {
      toast.success(`Marcado como ${STATUS_LABELS[status].toLowerCase()}`)
      load(businessId)
      if (selected?.id === q.id) setSelected({ ...q, status })
    }
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))
  }

  function updateItem(idx: number, field: keyof QuoteItem, value: string | number) {
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...f, items }
    })
  }

  function removeItem(idx: number) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  function fillFromService(idx: number, serviceId: string) {
    const svc = services.find(s => s.id === serviceId)
    if (!svc) return
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], serviceId, description: svc.name, unitPrice: svc.price }
      return { ...f, items }
    })
  }

  // ─── Detail view ──────────────────────────────────────────────────────────
  if (selected) {
    const total = calcTotal(selected.items, selected.discount)
    const subtotal = selected.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const discountAmt = subtotal * selected.discount / 100

    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="page-title">Presupuesto #{String(selected.number).padStart(4, "0")}</h1>
            <p className="page-subtitle">{selected.client?.name || "Sin cliente"}</p>
          </div>
          <Badge className={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={e => openEdit(selected, e)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Status actions */}
        <div className="flex gap-2 flex-wrap">
          {selected.status === "DRAFT" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-sky-400 border-sky-400/30 hover:bg-sky-500/10"
              onClick={() => changeStatus(selected, "SENT")}>
              <Send className="w-3.5 h-3.5" /> Marcar como enviado
            </Button>
          )}
          {(selected.status === "DRAFT" || selected.status === "SENT") && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 text-green-400 border-green-400/30 hover:bg-green-500/10"
                onClick={() => changeStatus(selected, "ACCEPTED")}>
                <Check className="w-3.5 h-3.5" /> Aceptado
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-red-400 border-red-400/30 hover:bg-red-500/10"
                onClick={() => changeStatus(selected, "REJECTED")}>
                <X className="w-3.5 h-3.5" /> Rechazado
              </Button>
            </>
          )}
          {selected.status === "SENT" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-orange-400 border-orange-400/30 hover:bg-orange-500/10"
              onClick={() => changeStatus(selected, "EXPIRED")}>
              <Clock className="w-3.5 h-3.5" /> Vencido
            </Button>
          )}
        </div>

        {/* Info card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selected.client && (
              <div>
                <p className="text-white/40 text-xs mb-1">Cliente</p>
                <p className="font-medium">{selected.client.name}</p>
                <p className="text-white/40 text-xs">{selected.client.email}</p>
              </div>
            )}
            <div>
              <p className="text-white/40 text-xs mb-1">Fecha</p>
              <p className="font-medium">{format(new Date(selected.createdAt), "d MMM yyyy", { locale: es })}</p>
            </div>
            {selected.validUntil && (
              <div>
                <p className="text-white/40 text-xs mb-1">Válido hasta</p>
                <p className="font-medium">{format(new Date(selected.validUntil), "d MMM yyyy", { locale: es })}</p>
              </div>
            )}
            {selected.notes && (
              <div className="col-span-2">
                <p className="text-white/40 text-xs mb-1">Notas</p>
                <p className="text-white/70 text-sm">{selected.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-white/40 font-medium border-b border-white/8">
            <span className="col-span-6">Descripción</span>
            <span className="col-span-2 text-right">Cant.</span>
            <span className="col-span-2 text-right">P. unit.</span>
            <span className="col-span-2 text-right">Total</span>
          </div>
          {selected.items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-white/5 last:border-0">
              <span className="col-span-6 font-medium">{item.description}</span>
              <span className="col-span-2 text-right text-white/60">{item.quantity}</span>
              <span className="col-span-2 text-right text-white/60">${item.unitPrice.toLocaleString("es-CL")}</span>
              <span className="col-span-2 text-right font-medium">${(item.quantity * item.unitPrice).toLocaleString("es-CL")}</span>
            </div>
          ))}

          {/* Totals */}
          <div className="px-4 py-3 space-y-1.5 border-t border-white/10 bg-white/[0.02]">
            <div className="flex justify-between text-sm text-white/50">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString("es-CL")}</span>
            </div>
            {selected.discount > 0 && (
              <div className="flex justify-between text-sm text-green-400">
                <span>Descuento ({selected.discount}%)</span>
                <span>−${discountAmt.toLocaleString("es-CL")}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-white/10">
              <span>Total</span>
              <span className="text-sky-300">${total.toLocaleString("es-CL")}</span>
            </div>
          </div>
        </div>

        {/* Edit dialog */}
        <QuoteFormDialog
          open={open} onOpenChange={setOpen} editing={editing}
          form={form} setForm={setForm} saving={saving} onSave={handleSave}
          clients={clients} services={services}
          addItem={addItem} updateItem={updateItem} removeItem={removeItem} fillFromService={fillFromService}
        />
      </div>
    )
  }

  // ─── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Presupuestos</h1>
          <p className="page-subtitle">Crea y gestiona cotizaciones para tus clientes</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo presupuesto
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <p className="font-medium text-white/50">Sin presupuestos</p>
          <p className="text-sm mt-1">Crea tu primer presupuesto para un cliente</p>
          <Button className="mt-4" onClick={openNew}>Crear presupuesto</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map(q => {
            const total = calcTotal(q.items, q.discount)
            return (
              <div
                key={q.id}
                onClick={() => setSelected(q)}
                className="group flex items-center gap-4 px-5 py-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Hash className="w-4 h-4 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">#{String(q.number).padStart(4, "0")}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[q.status]}`}>
                      {STATUS_LABELS[q.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {q.client && (
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <User className="w-3 h-3" />{q.client.name}
                      </span>
                    )}
                    <span className="text-xs text-white/30">
                      {format(new Date(q.createdAt), "d MMM yyyy", { locale: es })}
                    </span>
                    <span className="text-xs text-white/30">
                      {q.items.length} ítem{q.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sky-300">${total.toLocaleString("es-CL")}</p>
                  {q.discount > 0 && (
                    <p className="text-xs text-green-400 flex items-center gap-0.5 justify-end">
                      <Percent className="w-3 h-3" />{q.discount}% desc.
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => openEdit(q, e)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/40 transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={e => handleDelete(q.id, e)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
            )
          })}
        </div>
      )}

      <QuoteFormDialog
        open={open} onOpenChange={setOpen} editing={editing}
        form={form} setForm={setForm} saving={saving} onSave={handleSave}
        clients={clients} services={services}
        addItem={addItem} updateItem={updateItem} removeItem={removeItem} fillFromService={fillFromService}
      />
    </div>
  )
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

type FormState = {
  clientId: string; notes: string; discount: number; validUntil: string
  items: QuoteItem[]
}

function QuoteFormDialog({
  open, onOpenChange, editing, form, setForm, saving, onSave,
  clients, services, addItem, updateItem, removeItem, fillFromService,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Quote | null
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  saving: boolean
  onSave: () => void
  clients: Client[]
  services: Service[]
  addItem: () => void
  updateItem: (idx: number, field: keyof QuoteItem, value: string | number) => void
  removeItem: (idx: number) => void
  fillFromService: (idx: number, serviceId: string) => void
}) {
  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const total = subtotal - (subtotal * form.discount) / 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-white/[0.08]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              {editing ? `Presupuesto #${String(editing.number).padStart(4, "0")}` : "Nuevo presupuesto"}
            </h2>
            <p className="text-xs text-white/35 mt-0.5">Completa los datos del presupuesto</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* Cliente + Válido hasta */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wide">Cliente</label>
              <div className="relative">
                <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-9 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/60 transition-colors"
                  style={{ colorScheme: "dark" }}>
                  <option value="" style={{ backgroundColor: "#28282c" }}>Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id} style={{ backgroundColor: "#28282c" }}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-white/30 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wide">Válido hasta</label>
              <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white focus:outline-none focus:border-sky-500/60 transition-colors"
                style={{ colorScheme: "dark" }} />
            </div>
          </div>

          {/* Ítems */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wide">Ítems *</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar ítem
              </button>
            </div>
            <div className="grid grid-cols-12 gap-1.5 text-[11px] text-white/25 px-1">
              <span className="col-span-5">Descripción</span>
              <span className="col-span-3">Servicio</span>
              <span className="col-span-1 text-right">Cant.</span>
              <span className="col-span-2 text-right">Precio</span>
              <span className="col-span-1" />
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                <div className="col-span-5">
                  <input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)}
                    placeholder="Descripción..."
                    className="w-full h-9 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-sky-500/60 transition-colors" />
                </div>
                <div className="col-span-3 relative">
                  <select value={item.serviceId || ""} onChange={e => fillFromService(idx, e.target.value)}
                    className="w-full h-9 rounded-xl border border-white/[0.08] bg-white/[0.05] px-2 pr-7 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/60 transition-colors"
                    style={{ colorScheme: "dark" }}>
                    <option value="" style={{ backgroundColor: "#28282c" }}>—</option>
                    {services.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: "#28282c" }}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
                <div className="col-span-1">
                  <input type="number" min={1} value={item.quantity} onFocus={e => e.target.select()}
                    onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                    className="w-full h-9 rounded-xl border border-white/[0.08] bg-white/[0.05] px-2 text-sm text-white text-right focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                </div>
                <div className="col-span-2">
                  <input type="number" min={0} value={item.unitPrice} onFocus={e => e.target.select()}
                    onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full h-9 rounded-xl border border-white/[0.08] bg-white/[0.05] px-2 text-sm text-white text-right focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                </div>
                <div className="col-span-1 flex justify-end">
                  {form.items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Descuento + Notas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wide">Descuento (%)</label>
              <input type="number" min={0} max={100} value={form.discount} onFocus={e => e.target.select()}
                onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wide">Notas internas</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional..."
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-sky-500/60 transition-colors" />
            </div>
          </div>

          {/* Total */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm text-white/40">
              <span>Subtotal</span><span>${subtotal.toLocaleString("es-CL")}</span>
            </div>
            {form.discount > 0 && (
              <div className="flex justify-between text-sm text-green-400">
                <span>Descuento ({form.discount}%)</span>
                <span>−${(subtotal * form.discount / 100).toLocaleString("es-CL")}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-1.5 border-t border-white/[0.08]">
              <span>Total</span>
              <span className="text-sky-300">${total.toLocaleString("es-CL")}</span>
            </div>
          </div>

          <button onClick={onSave} disabled={saving}
            className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear presupuesto"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
