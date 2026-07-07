"use client"
import React, { useState, useEffect, useCallback } from "react"
import { Plus, Users, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"

type Plan = { id: string; name: string; description: string | null; price: number; durationDays: number; isActive: boolean; _count: { memberships: number } }
type Membership = {
  id: string; clientId: string; planId: string; startDate: string; endDate: string; status: string
  client: { id: string; name: string; email: string | null }
  plan: { id: string; name: string; price: number; durationDays: number }
}
type Client = { id: string; name: string; email: string | null }

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400",
  EXPIRED: "bg-white/10 text-white/40",
  CANCELLED: "bg-red-500/20 text-red-400",
}
const STATUS_LABELS: Record<string, string> = { ACTIVE: "Activo", EXPIRED: "Vencido", CANCELLED: "Cancelado" }

export default function MembershipsPage() {
  const [businessId, setBusinessId] = useState("")
  const [plans, setPlans] = useState<Plan[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [planOpen, setPlanOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [planForm, setPlanForm] = useState({ name: "", description: "", price: 0, durationDays: 30 })
  const [memberForm, setMemberForm] = useState({ clientId: "", planId: "", startDate: new Date().toISOString().slice(0, 10) })

  const load = useCallback(async (bid: string) => {
    const [pRes, mRes, clRes] = await Promise.all([
      fetch(`/api/businesses/${bid}/membership-plans`),
      fetch(`/api/businesses/${bid}/client-memberships`),
      fetch(`/api/businesses/${bid}/clients`),
    ])
    const [pData, mData, clData] = await Promise.all([pRes.json(), mRes.json(), clRes.json()])
    setPlans(pData.plans || [])
    setMemberships(mData.memberships || [])
    setClients(clData.clients || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(d => {
      if (d.businessId) { setBusinessId(d.businessId); load(d.businessId) }
    })
  }, [load])

  async function savePlan() {
    if (!planForm.name.trim()) { toast.error("El nombre es requerido"); return }
    setSaving(true)
    const url = editingPlan ? `/api/businesses/${businessId}/membership-plans/${editingPlan.id}` : `/api/businesses/${businessId}/membership-plans`
    const r = await fetch(url, { method: editingPlan ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(planForm) })
    if (r.ok) { toast.success(editingPlan ? "Plan actualizado" : "Plan creado"); setPlanOpen(false); load(businessId) }
    else toast.error("Error al guardar")
    setSaving(false)
  }

  async function saveMember() {
    if (!memberForm.clientId || !memberForm.planId) { toast.error("Selecciona cliente y plan"); return }
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/client-memberships`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberForm),
    })
    if (r.ok) { toast.success("Membresía asignada"); setMemberOpen(false); load(businessId) }
    else toast.error("Error al asignar")
    setSaving(false)
  }

  async function cancelMembership(id: string) {
    if (!confirm("¿Cancelar esta membresía?")) return
    await fetch(`/api/businesses/${businessId}/client-memberships/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    })
    toast.success("Membresía cancelada")
    load(businessId)
  }

  const selectedPlan = plans.find(p => p.id === memberForm.planId)
  const endDatePreview = selectedPlan && memberForm.startDate
    ? addDays(new Date(memberForm.startDate), selectedPlan.durationDays - 1).toISOString().slice(0, 10)
    : null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Membresías</h1>
          <p className="page-subtitle">Planes de acceso y socios del club</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingPlan(null); setPlanForm({ name: "", description: "", price: 0, durationDays: 30 }); setPlanOpen(true) }}
            className="gap-2 border-white/20 text-white/70 hover:bg-white/[0.06]">
            <Plus className="w-4 h-4" /> Nuevo plan
          </Button>
          <Button onClick={() => { setMemberForm({ clientId: "", planId: "", startDate: new Date().toISOString().slice(0, 10) }); setMemberOpen(true) }}
            className="bg-sky-500 hover:bg-sky-400 gap-2">
            <Plus className="w-4 h-4" /> Asignar membresía
          </Button>
        </div>
      </div>

      {/* Plans */}
      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Planes</p>
        {plans.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/30 text-sm">
            No hay planes creados aún
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{p.name}</p>
                    {p.description && <p className="text-xs text-white/40 mt-0.5">{p.description}</p>}
                  </div>
                  <button onClick={() => { setEditingPlan(p); setPlanForm({ name: p.name, description: p.description || "", price: Number(p.price), durationDays: p.durationDays }); setPlanOpen(true) }}
                    className="text-white/30 hover:text-white transition-colors text-xs">Editar</button>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-sky-400">${Number(p.price).toLocaleString("es-CL")}</p>
                    <p className="text-xs text-white/40">{p.durationDays} días</p>
                  </div>
                  <p className="text-xs text-white/30">{p._count.memberships} socios activos</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active memberships */}
      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Socios</p>
        {memberships.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/30 text-sm">
            No hay membresías asignadas
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {memberships.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{m.client.name}</p>
                    <p className="text-xs text-white/40">{m.plan.name} · vence {format(new Date(m.endDate), "d MMM yyyy", { locale: es })}</p>
                  </div>
                  <Badge className={`text-[10px] ${STATUS_COLORS[m.status]}`}>{STATUS_LABELS[m.status]}</Badge>
                  {m.status === "ACTIVE" && (
                    <button onClick={() => cancelMembership(m.id)} className="text-xs text-white/20 hover:text-red-400 transition-colors">Cancelar</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plan modal */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden border-white/[0.08]">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h2 className="text-[15px] font-semibold text-white">{editingPlan ? "Editar plan" : "Nuevo plan"}</h2>
            <button onClick={() => setPlanOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 pb-5 space-y-3">
            <input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del plan *"
              className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
            <input value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción (opcional)"
              className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/30">$</span>
                <input type="number" value={planForm.price} onFocus={e => e.target.select()} onChange={e => setPlanForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="Precio"
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] pl-8 pr-4 text-sm text-white focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
              </div>
              <div className="relative">
                <input type="number" value={planForm.durationDays} onFocus={e => e.target.select()} onChange={e => setPlanForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 30 }))}
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-10 text-sm text-white focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-white/30">días</span>
              </div>
            </div>
            <Button onClick={savePlan} disabled={saving} className="w-full bg-sky-500 hover:bg-sky-400 h-11 font-semibold">
              {saving ? "Guardando…" : editingPlan ? "Guardar cambios" : "Crear plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign membership modal */}
      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden border-white/[0.08]">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h2 className="text-[15px] font-semibold text-white">Asignar membresía</h2>
            <button onClick={() => setMemberOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 pb-5 space-y-3">
            <div className="relative">
              <select value={memberForm.clientId} onChange={e => setMemberForm(f => ({ ...f, clientId: e.target.value }))}
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-9 text-sm text-white focus:outline-none focus:border-sky-500/60 appearance-none">
                <option value="">Seleccionar cliente *</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={memberForm.planId} onChange={e => setMemberForm(f => ({ ...f, planId: e.target.value }))}
                className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 pr-9 text-sm text-white focus:outline-none focus:border-sky-500/60 appearance-none">
                <option value="">Seleccionar plan *</option>
                {plans.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name} — ${Number(p.price).toLocaleString("es-CL")} / {p.durationDays}d</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
            <input type="date" value={memberForm.startDate} onChange={e => setMemberForm(f => ({ ...f, startDate: e.target.value }))}
              className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white focus:outline-none focus:border-sky-500/60 [color-scheme:dark]" />
            {endDatePreview && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5 flex items-center justify-between">
                <p className="text-xs text-white/50">Vence el</p>
                <p className="text-sm font-semibold text-emerald-400">{format(new Date(endDatePreview), "d 'de' MMMM yyyy", { locale: es })}</p>
              </div>
            )}
            <Button onClick={saveMember} disabled={saving} className="w-full bg-sky-500 hover:bg-sky-400 h-11 font-semibold">
              {saving ? "Guardando…" : "Asignar membresía"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
