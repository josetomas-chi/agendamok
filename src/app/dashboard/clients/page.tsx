"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useBusiness } from "@/contexts/business-context"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, Search, Mail, Phone, Calendar, Tag, Upload, CheckCircle, AlertCircle, Stethoscope, Star, Gift } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const WaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)
function waHref(phone: string) {
  const digits = phone.replace(/\D/g, "")
  return `https://wa.me/${digits.startsWith("56") ? digits : `56${digits}`}`
}

type Client = {
  id: string; name: string; email: string | null; phone: string | null
  notes: string | null; tags: string[]; segment: string; loyaltyPoints: number
  allowTransfer: boolean
  createdAt: string
  _count: { appointments: number }
  appointments: { payment: { amount: number } | null }[]
}

const SEGMENT_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Nuevo", color: "bg-sky-500/30 text-sky-200" },
  REGULAR: { label: "Regular", color: "bg-white/15 text-white/80" },
  FREQUENT: { label: "Frecuente", color: "bg-green-500/30 text-green-200" },
  VIP: { label: "VIP", color: "bg-purple-500/30 text-purple-200" },
  INFLUENCER: { label: "Influencer", color: "bg-pink-500/30 text-pink-200" },
  AT_RISK: { label: "En riesgo", color: "bg-orange-500/30 text-orange-200" },
}

type ImportRow = { name: string; email: string; phone: string; notes: string; _error?: string }
type ImportState = "idle" | "preview" | "importing" | "done"

export default function ClientsPage() {
  const { businessId, businessType } = useBusiness()
  const isSports = businessType === "SPORTS_CLUB"
  const [clients, setClients] = useState<Client[]>([])
  const [clinicalEnabled, setClinicalEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [segment, setSegment] = useState("")
  const [selected, setSelected] = useState<Client | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importState, setImportState] = useState<ImportState>("idle")
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!businessId) return
    loadClients(businessId, "", "")
    fetch(`/api/businesses/${businessId}`).then(r => r.json()).then(b => {
      setClinicalEnabled(b.business?.clinicalRecordEnabled ?? false)
    })
  }, [businessId])

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const normalize = (key: string) => key.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()
    const colMap: Record<string, string> = {
      nombre: "name", name: "name",
      email: "email", correo: "email",
      telefono: "phone", phone: "phone", cel: "phone", celular: "phone",
      notas: "notes", notes: "notes", observaciones: "notes",
    }

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
    let raw: Record<string, string>[] = []

    if (isExcel) {
      const { read, utils } = await import("xlsx")
      const buffer = await file.arrayBuffer()
      const wb = read(buffer, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      raw = utils.sheet_to_json(ws, { defval: "" })
    } else {
      const text = await file.text()
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
      raw = result.data
    }

    const rows: ImportRow[] = raw.map(r => {
      const mapped: ImportRow = { name: "", email: "", phone: "", notes: "" }
      for (const [k, v] of Object.entries(r)) {
        const field = colMap[normalize(k)]
        if (field) (mapped as Record<string, string>)[field] = String(v).trim()
      }
      if (!mapped.name) mapped._error = "Sin nombre"
      return mapped
    }).filter(r => r.name || r._error)

    setImportRows(rows)
    setImportState("preview")
    setImportOpen(true)
  }

  async function handleImport() {
    setImportState("importing")
    const validRows = importRows.filter(r => !r._error)
    const r = await fetch(`/api/businesses/${businessId}/clients/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: validRows }),
    })
    const d = await r.json()
    if (r.ok) {
      setImportResult({ created: d.created, skipped: d.skipped })
      setImportState("done")
      loadClients(businessId, search, segment)
    } else {
      toast.error(d.error || "Error al importar")
      setImportState("preview")
    }
  }

  function resetImport() {
    setImportOpen(false)
    setImportState("idle")
    setImportRows([])
    setImportResult(null)
  }

  const [pointsInput, setPointsInput] = useState("")
  const [savingClient, setSavingClient] = useState(false)

  async function patchClient(clientId: string, data: Record<string, unknown>) {
    setSavingClient(true)
    const r = await fetch(`/api/businesses/${businessId}/clients/${clientId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (r.ok) {
      const { client: updated } = await r.json()
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...updated } : c))
      setSelected(prev => prev?.id === clientId ? { ...prev, ...updated } : prev)
      toast.success("Cliente actualizado")
    } else toast.error("Error al actualizar")
    setSavingClient(false)
  }

  const totalSpend = (c: Client) => c.appointments.reduce((sum, a) => sum + (a.payment ? Number(a.payment.amount) : 0), 0)

  const GOLD = "#C9A84C"
  const NAVY = "#0d1b2a"
  const NAVY2 = "#111f2d"
  const BORDER = "rgba(201,168,76,0.2)"

  const S_SEGMENT: Record<string, { label: string; bg: string; color: string }> = {
    NEW:        { label: "Nuevo",      bg: "rgba(201,168,76,0.12)", color: GOLD },
    REGULAR:    { label: "Regular",    bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" },
    FREQUENT:   { label: "Frecuente", bg: "rgba(74,222,128,0.15)", color: "#4ade80" },
    VIP:        { label: "VIP",        bg: "rgba(168,85,247,0.15)", color: "#c084fc" },
    INFLUENCER: { label: "Influencer", bg: "rgba(236,72,153,0.15)", color: "#f472b6" },
    AT_RISK:    { label: "En riesgo",  bg: "rgba(251,146,60,0.15)", color: "#fb923c" },
  }

  if (isSports) return (
    <div className="min-h-screen p-8" style={{ background: NAVY }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide" style={{ color: "#ffffff" }}>Clientes</h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{clients.length} clientes en total</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold transition-colors"
            style={{ border: BORDER, color: GOLD, background: "transparent" }}>
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-black uppercase tracking-wide transition-colors"
            style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
            <Plus className="w-4 h-4" /> Nuevo cliente
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-6">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(201,168,76,0.5)" }} />
          <input className="w-full h-10 rounded-xl pl-9 pr-4 text-sm"
            style={{ border: BORDER, background: NAVY2, color: "#fff", outline: "none" }}
            placeholder="Buscar por nombre, email o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "VIP", "INFLUENCER", "FREQUENT", "AT_RISK", "NEW"].map(s => (
            <button key={s} onClick={() => setSegment(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
              style={segment === s
                ? { background: "rgba(201,168,76,0.18)", border: `1px solid ${GOLD}`, color: GOLD }
                : { border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", background: "transparent" }}>
              {s === "" ? "Todos" : S_SEGMENT[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl" style={{ background: NAVY2 }} />)}</div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 select-none">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mb-5" style={{ opacity: 0.18 }}>
            <circle cx="28" cy="26" r="12" stroke="#C9A84C" strokeWidth="2.5"/>
            <path d="M8 60c0-11 9-18 20-18s20 7 20 18" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="52" cy="28" r="8" stroke="#C9A84C" strokeWidth="2"/>
            <path d="M46 56c0-7 5-12 12-12" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="font-semibold text-base" style={{ color: "rgba(255,255,255,0.5)" }}>{search ? "Sin resultados" : "Aún no hay clientes"}</p>
          <p className="text-sm mt-1.5 max-w-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
            {search ? `No encontramos a nadie con "${search}"` : "Agrega clientes o impórtalos desde un archivo CSV"}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: BORDER, background: NAVY2 }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.12)", background: NAVY }}>
                {["Cliente", "Reservas", "Gasto total", "Puntos", "Segmento", ""].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] ${i === 0 ? "text-left" : i <= 3 ? "text-center" : "text-center"}`}
                    style={{ color: "rgba(201,168,76,0.5)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, idx) => (
                <tr key={c.id} style={{ borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
                  className="transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.04)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={{ background: "rgba(201,168,76,0.15)", color: GOLD }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate" style={{ color: "#fff" }}>{c.name}</p>
                        <div className="flex gap-3 text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {c.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{c.email}</span>}
                          {c.phone && <a href={waHref(c.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: "#25D366" }}><WaIcon />{c.phone}</a>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{c._count.appointments}</td>
                  <td className="px-5 py-3.5 text-center font-bold" style={{ color: GOLD }}>${totalSpend(c).toLocaleString("es-CL")}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="flex items-center justify-center gap-1 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                      <Gift className="w-3.5 h-3.5" style={{ color: GOLD }} />{c.loyaltyPoints}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide"
                      style={{ background: S_SEGMENT[c.segment]?.bg || "rgba(255,255,255,0.08)", color: S_SEGMENT[c.segment]?.color || "rgba(255,255,255,0.5)" }}>
                      {S_SEGMENT[c.segment]?.label || c.segment}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setSelected(c)}
                      className="h-7 px-3 rounded-lg text-xs font-semibold transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", background: "transparent" }}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Diálogos compartidos (sports + general) ── */}
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
        <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setPointsInput("") }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  {selected.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle>{selected.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENT_LABELS[selected.segment]?.color}`}>
                      {SEGMENT_LABELS[selected.segment]?.label}
                    </span>
                    <select
                      value={selected.segment}
                      onChange={e => patchClient(selected.id, { segment: e.target.value })}
                      disabled={savingClient}
                      className="text-xs h-6 rounded-full border border-white/15 bg-white/[0.05] px-2 text-white/60 focus:outline-none focus:border-sky-500/60 appearance-none cursor-pointer"
                      style={{ colorScheme: "dark" }}
                    >
                      {Object.entries(SEGMENT_LABELS).map(([val, { label }]) => (
                        <option key={val} value={val} style={{ backgroundColor: "#28282c" }}>{label}</option>
                      ))}
                    </select>
                  </div>
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
              <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-300">{selected.loyaltyPoints}</p>
                <p className="text-xs text-yellow-400/60 mt-1">Puntos</p>
              </div>
            </div>

            {/* Points adjustment */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <p className="text-xs font-medium text-white/50 mb-2 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-yellow-400/60" /> Ajustar puntos manualmente
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={pointsInput}
                  onFocus={e => e.target.select()}
                  onChange={e => setPointsInput(e.target.value)}
                  placeholder={String(selected.loyaltyPoints)}
                  className="flex-1 h-8 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-sky-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  onClick={() => {
                    if (pointsInput === "") return
                    patchClient(selected.id, { loyaltyPoints: Number(pointsInput) })
                    setPointsInput("")
                  }}
                  disabled={savingClient || pointsInput === ""}
                  className="px-3 h-8 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-medium hover:bg-sky-500/30 disabled:opacity-40 transition-colors"
                >
                  Guardar
                </button>
              </div>
              <p className="text-[11px] text-white/25 mt-1.5">Se asigna VIP automáticamente al llegar a 500 pts · +10 pts por turno completado</p>
            </div>

            {/* Pago por transferencia */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/70 flex items-center gap-1.5">
                  <span>🏦</span> Pago por transferencia
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">El cliente puede adjuntar comprobante al reservar</p>
              </div>
              <button
                onClick={() => patchClient(selected.id, { allowTransfer: !selected.allowTransfer })}
                disabled={savingClient}
                className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${selected.allowTransfer ? "bg-sky-500" : "bg-white/10"}`}
                style={{ height: 22, width: 40 }}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${selected.allowTransfer ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              {selected.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{selected.email}</div>}
              {selected.phone && <a href={waHref(selected.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: "#25D366" }}><WaIcon />{selected.phone}</a>}
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
      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={v => { if (!v) resetImport() }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {importState === "done" ? "Importación completada" : "Previsualizar importación"}
            </DialogTitle>
          </DialogHeader>

          {importState === "done" && importResult && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="w-16 h-16 text-green-400" />
              <div className="text-center">
                <p className="text-xl font-bold">{importResult.created} clientes importados</p>
                {importResult.skipped > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">{importResult.skipped} omitidos por email duplicado</p>
                )}
              </div>
              <Button onClick={resetImport}>Cerrar</Button>
            </div>
          )}

          {(importState === "preview" || importState === "importing") && (
            <>
              <div className="text-sm text-muted-foreground">
                {importRows.filter(r => !r._error).length} filas válidas ·{" "}
                {importRows.filter(r => r._error).length > 0 && (
                  <span className="text-orange-400">{importRows.filter(r => r._error).length} con error (se omitirán)</span>
                )}
              </div>

              <div className="overflow-auto flex-1 border border-white/10 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Nombre</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Teléfono</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {importRows.map((row, i) => (
                      <tr key={i} className={row._error ? "opacity-50" : ""}>
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{row.name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.email || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.phone || "—"}</td>
                        <td className="px-3 py-2">
                          {row._error
                            ? <span className="flex items-center gap-1 text-orange-400 text-xs"><AlertCircle className="w-3 h-3" />{row._error}</span>
                            : <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3 h-3" />OK</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={handleImport} disabled={importState === "importing" || importRows.filter(r => !r._error).length === 0}>
                  {importState === "importing" ? "Importando..." : `Importar ${importRows.filter(r => !r._error).length} clientes`}
                </Button>
                <Button variant="outline" onClick={resetImport} disabled={importState === "importing"}>Cancelar</Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Columnas aceptadas: <strong>nombre</strong>, <strong>email</strong>, <strong>teléfono</strong> (o phone/cel), <strong>notas</strong>
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  // ── Render general (no sports) ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clients.length} clientes en total</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Nuevo cliente</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nombre, email o teléfono..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["", "VIP", "INFLUENCER", "FREQUENT", "AT_RISK", "NEW"].map(s => (
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
        <div className="flex flex-col items-center justify-center py-24 select-none">
          <p className="text-white/70 font-semibold text-base">{search ? "Sin resultados" : "Aún no hay clientes"}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2.5">Cliente</th>
                <th className="text-center px-4 py-2.5">Turnos</th>
                <th className="text-right px-4 py-2.5">Gasto total</th>
                <th className="text-center px-4 py-2.5">Puntos</th>
                <th className="text-center px-4 py-2.5">Segmento</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {c.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{c.email}</span>}
                          {c.phone && <a href={waHref(c.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: "#25D366" }}><WaIcon />{c.phone}</a>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{c._count.appointments}</td>
                  <td className="px-4 py-3 text-right font-medium">${totalSpend(c).toLocaleString("es-AR")}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-sm font-medium">
                      <Gift className="w-3.5 h-3.5 text-yellow-400/70" />{c.loyaltyPoints}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEGMENT_LABELS[c.segment]?.color}`}>
                      {SEGMENT_LABELS[c.segment]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {clinicalEnabled && (
                        <Link href={`/dashboard/clinical/${c.id}`}>
                          <Button size="sm" variant="ghost" className="gap-1 text-sky-400 hover:text-sky-300">
                            <Stethoscope className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setSelected(c)}>Ver</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {selected && (
        <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setPointsInput("") }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                  {selected.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle>{selected.name}</DialogTitle>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              {selected.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{selected.email}</div>}
              {selected.phone && <a href={waHref(selected.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: "#25D366" }}><WaIcon />{selected.phone}</a>}
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" />Cliente desde {format(new Date(selected.createdAt), "MMMM yyyy", { locale: es })}</div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
