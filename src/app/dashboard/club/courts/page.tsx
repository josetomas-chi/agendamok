"use client"
import React, { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Trophy, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"

type PricingRule = { id?: string; name: string; days: number[]; startTime: string; endTime: string; price: number }
type Court = { id: string; name: string; sport: string | null; description: string | null; color: string; isActive: boolean; pricingRules: PricingRule[] }

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const EMPTY_RULE: PricingRule = { name: "", days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "18:00", price: 0 }

export default function CourtsPage() {
  const [businessId, setBusinessId] = useState("")
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Court | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", sport: "", description: "", color: "#38bdf8", pricingRules: [{ ...EMPTY_RULE }] as PricingRule[] })

  const load = useCallback(async (bid: string) => {
    const r = await fetch(`/api/businesses/${bid}/courts`)
    const d = await r.json()
    setCourts(d.courts || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(s => {
      const bid = s?.user?.businessId
      if (bid) { setBusinessId(bid); load(bid) }
    })
  }, [load])

  function openNew() {
    setEditing(null)
    setForm({ name: "", sport: "", description: "", color: "#38bdf8", pricingRules: [{ ...EMPTY_RULE }] })
    setOpen(true)
  }

  function openEdit(c: Court) {
    setEditing(c)
    setForm({ name: c.name, sport: c.sport || "", description: c.description || "", color: c.color, pricingRules: c.pricingRules.length > 0 ? c.pricingRules.map(r => ({ ...r })) : [{ ...EMPTY_RULE }] })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return }
    setSaving(true)
    const url = editing ? `/api/businesses/${businessId}/courts/${editing.id}` : `/api/businesses/${businessId}/courts`
    const method = editing ? "PATCH" : "POST"
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (r.ok) { toast.success(editing ? "Cancha actualizada" : "Cancha creada"); setOpen(false); load(businessId) }
    else toast.error("Error al guardar")
    setSaving(false)
  }

  async function handleDelete(c: Court) {
    if (!confirm(`¿Desactivar "${c.name}"?`)) return
    await fetch(`/api/businesses/${businessId}/courts/${c.id}`, { method: "DELETE" })
    toast.success("Cancha desactivada")
    load(businessId)
  }

  function updateRule(idx: number, field: keyof PricingRule, value: string | number | number[]) {
    setForm(f => { const rules = [...f.pricingRules]; rules[idx] = { ...rules[idx], [field]: value }; return { ...f, pricingRules: rules } })
  }

  function toggleDay(idx: number, day: number) {
    const rule = form.pricingRules[idx]
    const days = rule.days.includes(day) ? rule.days.filter(d => d !== day) : [...rule.days, day]
    updateRule(idx, "days", days)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Canchas y recursos</h1>
          <p className="page-subtitle">Gestiona tus instalaciones y tarifas por horario</p>
        </div>
        <Button onClick={openNew} className="bg-sky-500 hover:bg-sky-400 gap-2">
          <Plus className="w-4 h-4" /> Nueva cancha
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/30 text-sm">Cargando…</div>
      ) : courts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/40 text-sm">No hay canchas aún</p>
          <p className="text-white/20 text-xs mt-1">Crea tu primera cancha para empezar a recibir reservas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map(c => (
            <div key={c.id} className={`rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden ${!c.isActive ? "opacity-50" : ""}`}>
              <div className="h-1.5" style={{ background: c.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-white">{c.name}</p>
                    {c.sport && <p className="text-xs text-white/40 mt-0.5">{c.sport}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(c)} className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-400/30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {c.pricingRules.length > 0 ? (
                  <div className="space-y-1.5">
                    {c.pricingRules.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-white/40">{r.name} · {r.startTime}–{r.endTime}</span>
                        <span className="text-sky-400 font-medium">${Number(r.price).toLocaleString("es-CL")}/hr</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/25">Sin tarifas configuradas</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-white/[0.08] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 bg-[#1c1c1e] z-10 border-b border-white/[0.06]">
            <div>
              <h2 className="text-[15px] font-semibold text-white">{editing ? "Editar cancha" : "Nueva cancha"}</h2>
              <p className="text-xs text-white/35 mt-0.5">Configura las tarifas por franja horaria</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-4 pt-4">
            {/* Nombre + Deporte */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre de la cancha *"
                  className="w-full h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
              </div>
              <input value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}
                placeholder="Deporte (ej: Pádel)"
                className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
              <div className="flex items-center gap-3 h-11 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                <span className="text-sm text-white/50">Color</span>
              </div>
            </div>

            {/* Tarifas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Tarifas</p>
                <button onClick={() => setForm(f => ({ ...f, pricingRules: [...f.pricingRules, { ...EMPTY_RULE }] }))}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Agregar tarifa
                </button>
              </div>
              <div className="space-y-3">
                {form.pricingRules.map((rule, idx) => (
                  <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input value={rule.name} onChange={e => updateRule(idx, "name", e.target.value)}
                        placeholder="Nombre (ej: Valle, Punta)"
                        className="flex-1 h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/60" />
                      {form.pricingRules.length > 1 && (
                        <button onClick={() => setForm(f => ({ ...f, pricingRules: f.pricingRules.filter((_, i) => i !== idx) }))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* Días */}
                    <div className="flex gap-1">
                      {DAYS.map((d, di) => (
                        <button key={di} onClick={() => toggleDay(idx, di)}
                          className={`flex-1 h-7 rounded-md text-[10px] font-semibold transition-colors ${rule.days.includes(di) ? "bg-sky-500 text-white" : "bg-white/[0.05] text-white/30 hover:bg-white/[0.1]"}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                    {/* Horario + precio */}
                    <div className="grid grid-cols-3 gap-2">
                      <input type="time" value={rule.startTime} onChange={e => updateRule(idx, "startTime", e.target.value)}
                        className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 text-xs text-white focus:outline-none focus:border-sky-500/60 [color-scheme:dark]" />
                      <input type="time" value={rule.endTime} onChange={e => updateRule(idx, "endTime", e.target.value)}
                        className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] px-2 text-xs text-white focus:outline-none focus:border-sky-500/60 [color-scheme:dark]" />
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/30">$</span>
                        <input type="number" value={rule.price} onFocus={e => e.target.select()} onChange={e => updateRule(idx, "price", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full h-8 rounded-lg border border-white/[0.08] bg-white/[0.05] pl-6 pr-2 text-xs text-white focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                      </div>
                    </div>
                    <p className="text-[10px] text-white/25">Precio por hora en este rango</p>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full bg-sky-500 hover:bg-sky-400 h-11 font-semibold">
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear cancha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
