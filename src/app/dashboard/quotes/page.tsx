"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useBusiness } from "@/contexts/business-context"
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
  courtId?: string
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

type Client = { id: string; name: string; lastName?: string | null }
type Service = { id: string; name: string; price: number; duration: number }
type PricingRule = { id: string; name: string; price: number; fixedSlots: string[]; days: number[] }
type Court = { id: string; name: string; color: string; sport: string; pricingRules: PricingRule[] }

const STATUS_LABELS: Record<Quote["status"], string> = {
  DRAFT: "Borrador", SENT: "Enviado", ACCEPTED: "Aceptado", REJECTED: "Rechazado", EXPIRED: "Vencido",
}
const STATUS_COLORS: Record<Quote["status"], string> = {
  DRAFT: "bg-white/10 text-white/50",
  SENT: "bg-sky-500/20 text-sky-400",
  ACCEPTED: "bg-green-500/20 text-green-400",
  REJECTED: "bg-red-500/20 text-red-400",
  EXPIRED: "bg-orange-500/20 text-orange-400",
}
const STATUS_INLINE: Record<Quote["status"], React.CSSProperties> = {
  DRAFT:    { background: "rgba(13,27,42,0.07)", color: "rgba(13,27,42,0.5)" },
  SENT:     { background: "rgba(2,132,199,0.12)", color: "#0284c7" },
  ACCEPTED: { background: "rgba(22,163,74,0.12)", color: "#16a34a" },
  REJECTED: { background: "rgba(220,38,38,0.12)", color: "#dc2626" },
  EXPIRED:  { background: "rgba(234,88,12,0.12)", color: "#ea580c" },
}

function calcTotal(items: QuoteItem[], discount: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  return subtotal - (subtotal * discount) / 100
}

const EMPTY_ITEM: QuoteItem = { description: "", quantity: 1, unitPrice: 0 }

export default function QuotesPage() {
  const { businessId, businessType } = useBusiness()
  const isSportsClub = businessType === "SPORTS_CLUB"
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [courts, setCourts] = useState<Court[]>([])

  const [selected, setSelected] = useState<Quote | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Quote | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

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
    if (!businessId) return
    load(businessId)
    const fetches: Promise<Response>[] = [
      fetch(`/api/businesses/${businessId}/clients`),
      fetch(`/api/businesses/${businessId}/services`),
    ]
    if (isSportsClub) fetches.push(fetch(`/api/businesses/${businessId}/courts`))
    Promise.all(fetches)
      .then(rs => Promise.all(rs.map(r => r.json())))
      .then(([cd, sd, crd]) => {
        setClients(cd.clients || [])
        setServices(sd.services || [])
        if (crd) setCourts(crd.courts || [])
      })
  }, [load, isSportsClub])

  function openNew() {
    setEditing(null)
    setForm({ clientId: "", notes: "", discount: 0, validUntil: "", items: isSportsClub ? [] : [{ ...EMPTY_ITEM }] })
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
    const validItems = form.items.filter(i => i.description.trim() || i.courtId)
    if (validItems.length === 0) { toast.error("Agrega al menos un ítem o instalación"); return }
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
      const data = await r.json()
      toast.success(editing ? "Presupuesto actualizado" : "Presupuesto creado")
      setOpen(false)
      load(businessId)
      if (editing && selected?.id === editing.id && data.quote) setSelected(data.quote)
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

  async function sendQuote(q: Quote) {
    setSending(true)
    const r = await fetch(`/api/businesses/${businessId}/quotes/${q.id}/send`, { method: "POST" })
    if (r.ok) toast.success("Presupuesto enviado por email")
    else { const d = await r.json(); toast.error(d.error || "Error al enviar") }
    setSending(false)
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
      items[idx] = { ...items[idx], serviceId, courtId: undefined, description: svc.name, unitPrice: svc.price }
      return { ...f, items }
    })
  }

  function addCourtItem(court: Court) {
    const rule = court.pricingRules[0]
    const price = rule ? Number(rule.price) : 0
    const slots = rule?.fixedSlots ?? []
    const blockLabel = slots.length >= 2 ? `${slots[0]} – ${slots[slots.length - 1]}` : ""
    const desc = blockLabel ? `${court.name} · ${blockLabel}` : court.name
    setForm(f => ({
      ...f,
      items: [...f.items.filter(i => i.description.trim() || i.courtId), {
        description: desc,
        quantity: 1,
        unitPrice: price,
        courtId: court.id,
      }],
    }))
  }

  function updateCourtItem(idx: number, field: keyof QuoteItem, value: string | number) {
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [field]: value }
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
            <p className="page-subtitle">{selected.client ? [selected.client.name, selected.client.lastName].filter(Boolean).join(" ") : "Sin cliente"}</p>
          </div>
          <Badge className={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
          {selected.client?.email && (
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-sky-400 border-sky-400/30 hover:bg-sky-500/10"
              onClick={() => sendQuote(selected)} disabled={sending}>
              <Send className="w-3.5 h-3.5" />{sending ? "Enviando…" : "Enviar"}
            </Button>
          )}
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
          {(selected.status === "ACCEPTED" || selected.status === "REJECTED" || selected.status === "EXPIRED") && (
            <Button size="sm" variant="outline" className="gap-1.5 text-white/50 border-white/20 hover:bg-white/[0.06]"
              onClick={() => changeStatus(selected, "DRAFT")}>
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a borrador
            </Button>
          )}
          {selected.status === "SENT" && (
            <Button size="sm" variant="outline" className="gap-1.5 text-orange-400 border-orange-400/30 hover:bg-orange-500/10"
              onClick={() => changeStatus(selected, "EXPIRED")}>
              <Clock className="w-3.5 h-3.5" /> Vencido
            </Button>
          )}
        </div>

        {/* Info card */}
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: isSportsClub ? "#ffffff" : "rgba(255,255,255,0.03)", border: isSportsClub ? "1px solid rgba(13,27,42,0.08)" : "1px solid rgba(255,255,255,0.1)" }}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selected.client && (
              <div>
                <p className="text-xs mb-1" style={{ color: isSportsClub ? "rgba(13,27,42,0.45)" : "rgba(255,255,255,0.4)" }}>Cliente</p>
                <p className="font-medium" style={{ color: isSportsClub ? "#0d1b2a" : undefined }}>{[selected.client.name, selected.client.lastName].filter(Boolean).join(" ")}</p>
                <p className="text-xs" style={{ color: isSportsClub ? "rgba(13,27,42,0.45)" : "rgba(255,255,255,0.4)" }}>{selected.client.email}</p>
              </div>
            )}
            <div>
              <p className="text-xs mb-1" style={{ color: isSportsClub ? "rgba(13,27,42,0.45)" : "rgba(255,255,255,0.4)" }}>Fecha</p>
              <p className="font-medium" style={{ color: isSportsClub ? "#0d1b2a" : undefined }}>{format(new Date(selected.createdAt), "d MMM yyyy", { locale: es })}</p>
            </div>
            {selected.validUntil && (
              <div>
                <p className="text-xs mb-1" style={{ color: isSportsClub ? "rgba(13,27,42,0.45)" : "rgba(255,255,255,0.4)" }}>Válido hasta</p>
                <p className="font-medium" style={{ color: isSportsClub ? "#0d1b2a" : undefined }}>{format(new Date(selected.validUntil), "d MMM yyyy", { locale: es })}</p>
              </div>
            )}
            {selected.notes && (
              <div className="col-span-2">
                <p className="text-xs mb-1" style={{ color: isSportsClub ? "rgba(13,27,42,0.45)" : "rgba(255,255,255,0.4)" }}>Notas</p>
                <p className="text-sm" style={{ color: isSportsClub ? "rgba(13,27,42,0.7)" : "rgba(255,255,255,0.7)" }}>{selected.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: isSportsClub ? "1px solid rgba(13,27,42,0.08)" : "1px solid rgba(255,255,255,0.1)" }}>
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium"
            style={{ color: isSportsClub ? "rgba(13,27,42,0.45)" : "rgba(255,255,255,0.4)", background: isSportsClub ? "rgba(13,27,42,0.03)" : "rgba(255,255,255,0.03)", borderBottom: isSportsClub ? "1px solid rgba(13,27,42,0.08)" : "1px solid rgba(255,255,255,0.08)" }}>
            <span className="col-span-6">Descripción</span>
            <span className="col-span-2 text-right">Cant.</span>
            <span className="col-span-2 text-right">P. unit.</span>
            <span className="col-span-2 text-right">Total</span>
          </div>
          {selected.items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm"
              style={{ borderBottom: i < selected.items.length - 1 ? (isSportsClub ? "1px solid rgba(13,27,42,0.06)" : "1px solid rgba(255,255,255,0.05)") : undefined, background: isSportsClub ? (i % 2 === 0 ? "#ffffff" : "rgba(13,27,42,0.015)") : undefined }}>
              <span className="col-span-6 font-medium" style={{ color: isSportsClub ? "#0d1b2a" : undefined }}>{item.description}</span>
              <span className="col-span-2 text-right" style={{ color: isSportsClub ? "rgba(13,27,42,0.5)" : "rgba(255,255,255,0.6)" }}>{item.quantity}</span>
              <span className="col-span-2 text-right" style={{ color: isSportsClub ? "rgba(13,27,42,0.5)" : "rgba(255,255,255,0.6)" }}>${item.unitPrice.toLocaleString("es-CL")}</span>
              <span className="col-span-2 text-right font-medium" style={{ color: isSportsClub ? "#0d1b2a" : undefined }}>${(item.quantity * item.unitPrice).toLocaleString("es-CL")}</span>
            </div>
          ))}

          {/* Totals */}
          <div className="px-4 py-3 space-y-1.5"
            style={{ borderTop: isSportsClub ? "1px solid rgba(13,27,42,0.08)" : "1px solid rgba(255,255,255,0.1)", background: isSportsClub ? "rgba(13,27,42,0.02)" : "rgba(255,255,255,0.02)" }}>
            <div className="flex justify-between text-sm" style={{ color: isSportsClub ? "rgba(13,27,42,0.55)" : "rgba(255,255,255,0.5)" }}>
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString("es-CL")}</span>
            </div>
            {selected.discount > 0 && (
              <div className="flex justify-between text-sm" style={{ color: "#16a34a" }}>
                <span>Descuento ({selected.discount}%)</span>
                <span>−${discountAmt.toLocaleString("es-CL")}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1"
              style={{ borderTop: isSportsClub ? "1px solid rgba(13,27,42,0.08)" : "1px solid rgba(255,255,255,0.1)", color: isSportsClub ? "#0d1b2a" : undefined }}>
              <span>Total</span>
              <span style={{ color: "#0284c7" }}>${total.toLocaleString("es-CL")}</span>
            </div>
          </div>
        </div>

        {/* Edit dialog */}
        <QuoteFormDialog
          open={open} onOpenChange={setOpen} editing={editing}
          form={form} setForm={setForm} saving={saving} onSave={handleSave}
          clients={clients} services={services} courts={courts} isSportsClub={isSportsClub}
          addItem={addItem} updateItem={updateItem} removeItem={removeItem}
          fillFromService={fillFromService} addCourtItem={addCourtItem} updateCourtItem={updateCourtItem}
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
                className="group flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all"
                style={{ background: "#ffffff", border: "1px solid rgba(13,27,42,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)")}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(13,27,42,0.05)" }}>
                  <Hash className="w-4 h-4" style={{ color: "rgba(13,27,42,0.3)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: "#0d1b2a" }}>#{String(q.number).padStart(4, "0")}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={STATUS_INLINE[q.status]}>
                      {STATUS_LABELS[q.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {q.client && (
                      <span className="text-xs flex items-center gap-1" style={{ color: "rgba(13,27,42,0.55)" }}>
                        <User className="w-3 h-3" />{[q.client.name, q.client.lastName].filter(Boolean).join(" ")}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "rgba(13,27,42,0.4)" }}>
                      {format(new Date(q.createdAt), "d MMM yyyy", { locale: es })}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(13,27,42,0.4)" }}>
                      {q.items.length} ítem{q.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold" style={{ color: "#0284c7" }}>${total.toLocaleString("es-CL")}</p>
                  {q.discount > 0 && (
                    <p className="text-xs flex items-center gap-0.5 justify-end" style={{ color: "#16a34a" }}>
                      <Percent className="w-3 h-3" />{q.discount}% desc.
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => openEdit(q, e)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(13,27,42,0.05)", color: "rgba(13,27,42,0.4)" }}>
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={e => handleDelete(q.id, e)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(13,27,42,0.05)", color: "rgba(13,27,42,0.4)" }}>
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
        clients={clients} services={services} courts={courts} isSportsClub={isSportsClub}
        addItem={addItem} updateItem={updateItem} removeItem={removeItem}
        fillFromService={fillFromService} addCourtItem={addCourtItem} updateCourtItem={updateCourtItem}
      />
    </div>
  )
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

type FormState = {
  clientId: string; notes: string; discount: number; validUntil: string
  items: QuoteItem[]
}

function CourtItemRow({
  item, idx, court, updateCourtItem, removeItem,
}: {
  item: QuoteItem
  idx: number
  court: Court
  updateCourtItem: (idx: number, field: keyof QuoteItem, value: string | number) => void
  removeItem: (idx: number) => void
}) {
  const rules = court.pricingRules ?? []
  const selectedRule = rules.find(r => item.description.includes(r.name)) ?? rules[0]

  function applyRule(ruleId: string) {
    const rule = rules.find(r => r.id === ruleId)
    if (!rule) return
    const slots = rule.fixedSlots ?? []
    const blockLabel = slots.length >= 2 ? `${slots[0]} – ${slots[slots.length - 1]}` : ""
    const desc = blockLabel ? `${court.name} · ${rule.name} · ${blockLabel}` : `${court.name} · ${rule.name}`
    updateCourtItem(idx, "description", desc)
    updateCourtItem(idx, "unitPrice", Number(rule.price))
  }

  function applySlot(blockLabel: string) {
    // Replace any existing block label (HH:MM – HH:MM) at end of description
    const base = item.description.replace(/·\s*\d{2}:\d{2}\s*–\s*\d{2}:\d{2}.*$/, "").trim()
    updateCourtItem(idx, "description", `${base} · ${blockLabel}`)
  }

  const subtotal = item.quantity * item.unitPrice

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      {/* Court header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/[0.06]"
        style={{ borderLeft: `3px solid ${court.color}` }}>
        <span className="text-sm font-semibold text-white flex-1">{court.name}</span>
        <span className="text-[10px] text-white/30 uppercase tracking-wide">{court.sport}</span>
        <button onClick={() => removeItem(idx)} className="text-white/20 hover:text-red-400 transition-colors ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Pricing rule selector */}
        {rules.length > 0 && (
          <div className="space-y-1">
            <label className="text-[10px] text-white/35 uppercase tracking-wide font-medium">Tarifa</label>
            <div className="flex flex-wrap gap-1.5">
              {rules.map(rule => {
                const isActive = selectedRule?.id === rule.id
                return (
                  <button key={rule.id} type="button" onClick={() => applyRule(rule.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={isActive
                      ? { background: court.color, color: "#0d1b2a" }
                      : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {rule.name} — ${Number(rule.price).toLocaleString("es-CL")}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Duration slots — each pair of consecutive fixedSlots is a bookable block */}
        {(selectedRule?.fixedSlots?.length ?? 0) >= 2 && (
          <div className="space-y-1">
            <label className="text-[10px] text-white/35 uppercase tracking-wide font-medium">Bloque horario</label>
            <div className="flex gap-1.5 flex-wrap">
              {selectedRule!.fixedSlots.slice(0, -1).map((start, i) => {
                const end = selectedRule!.fixedSlots[i + 1]
                const label = `${start} – ${end}`
                const isActive = item.description.includes(label)
                return (
                  <button key={label} type="button" onClick={() => applySlot(label)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={isActive
                      ? { background: "rgba(56,189,248,0.15)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.3)" }
                      : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Description (editable) */}
        <input value={item.description} onChange={e => updateCourtItem(idx, "description", e.target.value)}
          placeholder="Descripción..."
          className="w-full h-8 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-sky-500/50 transition-colors" />

        {/* Sessions + price + subtotal */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-white/35 whitespace-nowrap">Sesiones</label>
            <input type="number" min={1} value={item.quantity} onFocus={e => e.target.select()}
              onChange={e => updateCourtItem(idx, "quantity", parseInt(e.target.value) || 1)}
              className="w-16 h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 text-sm text-white text-center focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          </div>
          <div className="flex items-center gap-2 w-full">
            <label className="text-[10px] text-white/35 whitespace-nowrap">Precio unit.</label>
            <div className="relative w-full">
              <span className="absolute left-2.5 top-1.5 text-xs text-white/30">$</span>
              <input type="number" min={0} value={item.unitPrice} onFocus={e => e.target.select()}
                onChange={e => updateCourtItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                className="w-full h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] pl-6 pr-2 text-sm text-white text-right focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
          </div>
          <div className="text-right min-w-[80px]">
            <p className="text-[10px] text-white/30">Subtotal</p>
            <p className="text-sm font-semibold text-white">${subtotal.toLocaleString("es-CL")}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuoteFormDialog({
  open, onOpenChange, editing, form, setForm, saving, onSave,
  clients, services, courts, isSportsClub,
  addItem, updateItem, removeItem, fillFromService, addCourtItem, updateCourtItem,
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
  courts: Court[]
  isSportsClub: boolean
  addItem: () => void
  updateItem: (idx: number, field: keyof QuoteItem, value: string | number) => void
  removeItem: (idx: number) => void
  fillFromService: (idx: number, serviceId: string) => void
  addCourtItem: (court: Court) => void
  updateCourtItem: (idx: number, field: keyof QuoteItem, value: string | number) => void
}) {
  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const total = subtotal - (subtotal * form.discount) / 100

  const courtItems = form.items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.courtId)
  const freeItems = form.items.map((item, idx) => ({ item, idx })).filter(({ item }) => !item.courtId)
  const activeCourts = courts.filter(c => !form.items.find(i => i.courtId === c.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border-white/[0.08]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
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

        <div className="px-5 pb-5 space-y-4 max-h-[82vh] overflow-y-auto pt-4">
          {/* Cliente + Válido hasta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Cliente</label>
              <div className="relative">
                <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 pr-9 text-sm text-white appearance-none focus:outline-none focus:border-sky-500/60 transition-colors"
                  style={{ colorScheme: "dark" }}>
                  <option value="" style={{ backgroundColor: "#28282c" }}>Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id} style={{ backgroundColor: "#28282c" }}>{[c.name, c.lastName].filter(Boolean).join(" ")}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-white/30 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Válido hasta</label>
              <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 text-sm text-white focus:outline-none focus:border-sky-500/60 transition-colors"
                style={{ colorScheme: "dark" }} />
            </div>
          </div>

          {/* ── SPORTS CLUB: court picker + court items ─────────────────── */}
          {isSportsClub && (
            <div className="space-y-3">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Instalaciones</label>

              {/* Court buttons — only show courts not yet added */}
              {activeCourts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeCourts.map(court => (
                    <button key={court.id} type="button" onClick={() => addCourtItem(court)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-95"
                      style={{ background: `${court.color}18`, border: `1px solid ${court.color}40`, color: court.color }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: court.color }} />
                      {court.name}
                      <Plus className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  ))}
                </div>
              )}

              {/* Court items */}
              {courtItems.length > 0 && (
                <div className="space-y-2">
                  {courtItems.map(({ item, idx }) => {
                    const court = courts.find(c => c.id === item.courtId)
                    if (!court) return null
                    return (
                      <CourtItemRow key={idx} item={item} idx={idx} court={court}
                        updateCourtItem={updateCourtItem} removeItem={removeItem} />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Ítems adicionales / regulares ───────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                {isSportsClub ? "Ítems adicionales" : "Ítems"}
              </label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar ítem
              </button>
            </div>

            {(!isSportsClub ? form.items.map((item, idx) => ({ item, idx })) : freeItems).map(({ item, idx }) => (
              <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-2">
                <input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)}
                  placeholder="Descripción del ítem..."
                  className="w-full h-9 rounded-lg border border-white/[0.06] bg-white/[0.05] px-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-sky-500/60 transition-colors" />
                <div className="flex gap-2 items-center">
                  {!isSportsClub && (
                    <div className="relative flex-1">
                      <select value={item.serviceId || ""} onChange={e => fillFromService(idx, e.target.value)}
                        className="w-full h-8 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 pr-8 text-xs text-white appearance-none focus:outline-none focus:border-sky-500/60"
                        style={{ colorScheme: "dark" }}>
                        <option value="" style={{ backgroundColor: "#28282c" }}>Servicio (opcional)</option>
                        {services.map(s => <option key={s.id} value={s.id} style={{ backgroundColor: "#28282c" }}>{s.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-white/30 whitespace-nowrap">Cant.</label>
                    <input type="number" min={1} value={item.quantity} onFocus={e => e.target.select()}
                      onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="w-14 h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 text-sm text-white text-center focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <label className="text-[10px] text-white/30 whitespace-nowrap">$ unit.</label>
                    <input type="number" min={0} value={item.unitPrice} onFocus={e => e.target.select()}
                      onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="w-full h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 text-sm text-white text-right focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                  </div>
                  <span className="text-xs font-semibold text-white/60 min-w-[64px] text-right">
                    ${(item.quantity * item.unitPrice).toLocaleString("es-CL")}
                  </span>
                  <button onClick={() => removeItem(idx)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {isSportsClub && freeItems.length === 0 && (
              <button onClick={addItem}
                className="w-full h-9 rounded-xl border border-dashed border-white/10 text-white/25 text-xs hover:border-white/20 hover:text-white/40 transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Catering, equipos, transporte…
              </button>
            )}
          </div>

          {/* Descuento + Notas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Descuento (%)</label>
              <input type="number" min={0} max={100} value={form.discount} onFocus={e => e.target.select()}
                onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Notas</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional..."
                className="w-full h-10 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-sky-500/60 transition-colors" />
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
            <div className="flex justify-between font-bold text-base pt-1.5 border-t border-white/[0.08]">
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
