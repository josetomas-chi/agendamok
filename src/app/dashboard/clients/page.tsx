"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Plus, Search, Mail, Phone, Calendar, Tag, Upload, CheckCircle, AlertCircle, Stethoscope } from "lucide-react"
import Link from "next/link"
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
  NEW: { label: "Nuevo", color: "bg-sky-500/30 text-sky-200" },
  REGULAR: { label: "Regular", color: "bg-white/15 text-white/80" },
  FREQUENT: { label: "Frecuente", color: "bg-green-500/30 text-green-200" },
  VIP: { label: "VIP", color: "bg-purple-500/30 text-purple-200" },
  AT_RISK: { label: "En riesgo", color: "bg-orange-500/30 text-orange-200" },
}

type ImportRow = { name: string; email: string; phone: string; notes: string; _error?: string }
type ImportState = "idle" | "preview" | "importing" | "done"

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [businessId, setBusinessId] = useState("")
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
    fetch("/api/me/business").then(r => r.json()).then(d => {
      setBusinessId(d.businessId)
      loadClients(d.businessId, "", "")
      fetch(`/api/businesses/${d.businessId}`).then(r => r.json()).then(b => {
        setClinicalEnabled(b.business?.clinicalRecordEnabled ?? false)
      })
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

  const totalSpend = (c: Client) => c.appointments.reduce((sum, a) => sum + (a.payment ? Number(a.payment.amount) : 0), 0)

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
        <div className="flex flex-col items-center justify-center py-24 select-none">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" className="mb-5 opacity-20">
            <circle cx="28" cy="26" r="12" stroke="white" strokeWidth="2.5"/>
            <path d="M8 60c0-11 9-18 20-18s20 7 20 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="52" cy="28" r="8" stroke="white" strokeWidth="2" opacity=".6"/>
            <path d="M46 56c0-7 5-12 12-12" stroke="white" strokeWidth="2" strokeLinecap="round" opacity=".6"/>
          </svg>
          <p className="text-white/70 font-semibold text-base">{search ? "Sin resultados" : "Aún no hay clientes"}</p>
          <p className="text-white/30 text-sm mt-1.5 max-w-xs text-center">
            {search ? `No encontramos a nadie con "${search}"` : "Los clientes aparecen automáticamente cuando reservan un turno"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2.5">Cliente</th>
                <th className="text-center px-4 py-2.5">Turnos</th>
                <th className="text-right px-4 py-2.5">Gasto total</th>
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
                          {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{c._count.appointments}</td>
                  <td className="px-4 py-3 text-right font-medium">${totalSpend(c).toLocaleString("es-AR")}</td>
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
}
