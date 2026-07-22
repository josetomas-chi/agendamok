"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Search, Building2, ExternalLink, Ban, CheckCircle, Plus, Gift } from "lucide-react"
import { Label } from "@/components/ui/label"

type Business = {
  id: string
  name: string
  slug: string
  category: string
  createdAt: string
  isActive: boolean
  chatBotEnabled: boolean
  whatsappBotEnabled: boolean
  twilioWhatsappNumber: string | null
  owner: { name: string; email: string }
  businessType: string
  subscription: { plan: string; status: string; isCourtesy: boolean } | null
  _count: { appointments: number; staff: number; clients: number }
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Business | null>(null)
  const [planValue, setPlanValue] = useState("")
  const [statusValue, setStatusValue] = useState("")
  const [typeValue, setTypeValue] = useState("REGULAR")
  const [chatBotValue, setChatBotValue] = useState(false)
  const [whatsappBotValue, setWhatsappBotValue] = useState(false)
  const [twilioNumber, setTwilioNumber] = useState("")
  const [saving, setSaving] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [newForm, setNewForm] = useState({ ownerName: "", ownerEmail: "", businessName: "", slug: "", category: "", plan: "FREE" })
  const [creating, setCreating] = useState(false)
  const [inviteUrl, setInviteUrl] = useState("")

  useEffect(() => {
    loadBusinesses()
  }, [])

  async function loadBusinesses() {
    setLoading(true)
    const r = await fetch("/api/admin/businesses")
    const d = await r.json()
    setBusinesses(d.businesses || [])
    setLoading(false)
  }

  async function grantCourtesy(b: Business, plan: string) {
    await fetch(`/api/admin/businesses/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, status: "ACTIVE", isCourtesy: true }),
    })
    toast.success(`Plan ${plan} activado como cortesía para ${b.name}`)
    loadBusinesses()
  }

  async function toggleActive(b: Business) {
    await fetch(`/api/admin/businesses/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !b.isActive }),
    })
    toast.success(b.isActive ? "Negocio suspendido" : "Negocio activado")
    loadBusinesses()
  }

  async function updatePlan() {
    if (!selected || !planValue) return
    setSaving(true)
    await fetch(`/api/admin/businesses/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planValue, status: statusValue, type: typeValue, chatBotEnabled: chatBotValue, whatsappBotEnabled: whatsappBotValue, twilioWhatsappNumber: twilioNumber.trim() || null }),
    })
    toast.success("Plan actualizado")
    setSelected(null)
    loadBusinesses()
    setSaving(false)
  }

  async function handleCreate() {
    const { ownerName, ownerEmail, businessName, slug, category } = newForm
    if (!ownerName || !ownerEmail || !businessName || !slug || !category) {
      toast.error("Completa todos los campos obligatorios")
      return
    }
    setCreating(true)
    const r = await fetch("/api/admin/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    })
    const d = await r.json()
    if (r.ok) {
      setInviteUrl(d.inviteUrl)
      loadBusinesses()
    } else {
      toast.error(d.error || "Error al crear negocio")
    }
    setCreating(false)
  }

  function resetNew() {
    setNewOpen(false)
    setInviteUrl("")
    setNewForm({ ownerName: "", ownerEmail: "", businessName: "", slug: "", category: "", plan: "FREE" })
  }

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.owner.email.toLowerCase().includes(search.toLowerCase())
  )

  const planColor: Record<string, string> = {
    FREE: "bg-white/10 text-white/50 border border-white/10",
    PRO: "bg-sky-500/20 text-sky-400 border border-sky-400/30",
    ENTERPRISE: "bg-violet-500/20 text-violet-400 border border-violet-400/30",
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Negocios</h1>
          <p className="page-subtitle">{businesses.length} negocios registrados</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 w-64"
              placeholder="Buscar negocio o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button className="gap-2" onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4" /> Nuevo negocio
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.07]">
            <tr>
              {["Negocio", "Dueño", "Plan", "Suscripción", "Citas", "Registro", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-white/40 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/[0.05]">
                  <td colSpan={7} className="px-4 py-3"><div className="h-4 bg-white/5 animate-pulse rounded" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-white/30">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No hay negocios
                </td>
              </tr>
            ) : filtered.map((b, i) => (
              <tr key={b.id} className={`transition-colors hover:bg-white/[0.03] ${i !== filtered.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-xs">
                      {b.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-white/90">{b.name}</p>
                      <p className="text-xs text-white/40">/{b.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-white/80">{b.owner.name}</p>
                  <p className="text-xs text-white/40">{b.owner.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColor[b.subscription?.plan || "FREE"]}`}>
                    {b.subscription?.plan || "FREE"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const s = b.subscription?.status
                    const map: Record<string, string> = {
                      TRIALING: "bg-amber-400/15 text-amber-400 border-amber-400/30",
                      ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
                      PAST_DUE: "bg-red-500/15 text-red-400 border-red-400/30",
                      CANCELED: "bg-white/10 text-white/40 border-white/10",
                      PAUSED: "bg-orange-500/15 text-orange-400 border-orange-400/30",
                    }
                    const label: Record<string, string> = { TRIALING: "Prueba", ACTIVE: "Activa", PAST_DUE: "Vencida", CANCELED: "Cancelada", PAUSED: "Pausada" }
                    return (
                      <div className="flex flex-col gap-1">
                        {s ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border w-fit ${map[s] || "bg-white/10 text-white/40 border-white/10"}`}>
                            {label[s] || s}
                          </span>
                        ) : <span className="text-white/30 text-xs">—</span>}
                        {b.subscription?.isCourtesy && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-violet-500/15 text-violet-400 border-violet-400/30 w-fit flex items-center gap-1">
                            <Gift className="w-2.5 h-2.5" /> Cortesía
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </td>
                <td className="px-4 py-3 text-white/50">{b._count.appointments}</td>
                <td className="px-4 py-3 text-white/40">{new Date(b.createdAt).toLocaleDateString("es-CL")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setSelected(b); setPlanValue(b.subscription?.plan || "FREE"); setStatusValue(b.subscription?.status || "ACTIVE"); setTypeValue(b.businessType === "SPORTS_CLUB" ? "SPORTS_CLUB" : "REGULAR"); setChatBotValue(b.chatBotEnabled); setWhatsappBotValue(b.whatsappBotEnabled); setTwilioNumber(b.twilioWhatsappNumber || "") }}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => window.open(`/book/${b.slug}`, "_blank")}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className={`h-7 px-2 ${b.isActive ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"}`} onClick={() => toggleActive(b)}>
                      {b.isActive ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New business dialog */}
      <Dialog open={newOpen} onOpenChange={resetNew}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo negocio</DialogTitle></DialogHeader>

          {inviteUrl ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center space-y-2">
                <p className="font-semibold text-green-800">Negocio creado exitosamente</p>
                <p className="text-sm text-green-700">Enviale este link al cliente para que cree su contrasena:</p>
              </div>
              <div className="space-y-1.5">
                <Label>Link de invitacion</Label>
                <div className="flex gap-2">
                  <Input value={inviteUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Link copiado") }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">El link expira en 7 dias</p>
              </div>
              <Button className="w-full" onClick={resetNew}>Cerrar</Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Datos del propietario</p>
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={newForm.ownerName} onChange={e => setNewForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="Nombre completo" />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={newForm.ownerEmail} onChange={e => setNewForm(f => ({ ...f, ownerEmail: e.target.value }))} placeholder="correo@ejemplo.com" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-1">Datos del negocio</p>
              <div className="space-y-1.5">
                <Label>Nombre del negocio *</Label>
                <Input value={newForm.businessName} onChange={e => {
                  const slug = e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
                  setNewForm(f => ({ ...f, businessName: e.target.value, slug }))
                }} placeholder="Mi negocio" />
              </div>
              <div className="space-y-1.5">
                <Label>Direccion web *</Label>
                <Input value={newForm.slug} onChange={e => setNewForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="mi-negocio" />
                <p className="text-xs text-muted-foreground">Tu pagina de reservas: <span className="font-medium text-foreground">/book/{newForm.slug || "mi-negocio"}</span></p>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={newForm.category} onValueChange={v => setNewForm(f => ({ ...f, category: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una categoria" /></SelectTrigger>
                  <SelectContent>
                    {["Peluqueria", "Barberia", "Spa", "Clinica dental", "Clinica medica", "Estetica", "Masajes", "Psicologia", "Nutricion", "Entrenamiento personal", "Otro"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plan inicial</Label>
                <Select value={newForm.plan} onValueChange={v => setNewForm(f => ({ ...f, plan: v ?? "FREE" }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent align="start" sideOffset={4} className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="STARTER">Starter — 0,3 UF/mes</SelectItem>
                    <SelectItem value="NEGOCIO">Negocio — 0,7 UF/mes</SelectItem>
                    <SelectItem value="PRO">Pro — 1,1 UF/mes</SelectItem>
                    <SelectItem value="SPORTS">Sports — 1,1 UF/mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={handleCreate} disabled={creating}>{creating ? "Creando..." : "Crear negocio"}</Button>
                <Button variant="outline" onClick={resetNew}>Cancelar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar — {selected?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Plan</p>
              <Select value={planValue} onValueChange={v => setPlanValue(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent align="start" sideOffset={4} className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="STARTER">Starter — 0,3 UF/mes</SelectItem>
                  <SelectItem value="NEGOCIO">Negocio — 0,7 UF/mes</SelectItem>
                  <SelectItem value="PRO">Pro — 1,1 UF/mes</SelectItem>
                  <SelectItem value="SPORTS">Sports — 1,1 UF/mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Tipo de negocio</p>
              <Select value={typeValue} onValueChange={v => setTypeValue(v ?? "REGULAR")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent align="start" sideOffset={4} className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="REGULAR">Regular (AgendaMok)</SelectItem>
                  <SelectItem value="SPORTS_CLUB">Club Deportivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Estado suscripción</p>
              <Select value={statusValue} onValueChange={v => setStatusValue(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent align="start" sideOffset={4} className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="TRIALING">Periodo de prueba</SelectItem>
                  <SelectItem value="ACTIVE">Activa (pagado)</SelectItem>
                  <SelectItem value="PAST_DUE">Vencida</SelectItem>
                  <SelectItem value="PAUSED">Pausada</SelectItem>
                  <SelectItem value="CANCELED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 bg-muted/30 rounded-lg">
                <p className="font-bold">{selected?._count.appointments}</p>
                <p className="text-xs text-muted-foreground">Citas</p>
              </div>
              <div className="p-2 bg-muted/30 rounded-lg">
                <p className="font-bold">{selected?._count.staff}</p>
                <p className="text-xs text-muted-foreground">Staff</p>
              </div>
              <div className="p-2 bg-muted/30 rounded-lg">
                <p className="font-bold">{selected?._count.clients}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
            </div>
            {selected?.subscription?.isCourtesy ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-400/20">
                <Gift className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <p className="text-xs text-violet-300">Este negocio tiene acceso por cortesía</p>
                <Button size="sm" variant="ghost" className="ml-auto text-xs text-white/40 hover:text-red-400 h-6 px-2"
                  onClick={async () => {
                    await fetch(`/api/admin/businesses/${selected.id}`, {
                      method: "PATCH", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ isCourtesy: false, status: "CANCELED" }),
                    })
                    toast.success("Cortesía revocada")
                    setSelected(null); loadBusinesses()
                  }}>
                  Revocar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Dar acceso sin pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: "Starter", value: "STARTER" }, { label: "Negocio", value: "NEGOCIO" }, { label: "Pro", value: "PRO" }].map(p => (
                    <Button key={p.value} size="sm" variant="outline"
                      className="gap-1.5 border-violet-400/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
                      onClick={() => { grantCourtesy(selected!, p.value); setSelected(null) }}>
                      <Gift className="w-3 h-3" /> {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-white/8">
              <div>
                <p className="text-sm font-medium">Asistente virtual (BOT web)</p>
                <p className="text-xs text-white/40">Activo en Negocio y Pro por defecto</p>
              </div>
              <button
                type="button"
                onClick={() => setChatBotValue(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${chatBotValue ? "bg-sky-500" : "bg-white/15"}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${chatBotValue ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <div className="space-y-2 p-3 rounded-xl bg-muted/20 border border-white/8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">BOT WhatsApp <span className="text-xs text-sky-400 ml-1">Add-on</span></p>
                  <p className="text-xs text-white/40">Recibe y responde reservas por WhatsApp</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsappBotValue(v => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${whatsappBotValue ? "bg-green-500" : "bg-white/15"}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${whatsappBotValue ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {whatsappBotValue && (
                <div>
                  <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wide">Número Twilio asignado</p>
                  <Input
                    value={twilioNumber}
                    onChange={e => setTwilioNumber(e.target.value)}
                    placeholder="+17373094339"
                    className="text-xs h-8 bg-white/5 border-white/10"
                  />
                  <p className="text-[10px] text-white/30 mt-1">Formato E.164 sin prefijo whatsapp:</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={updatePlan} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
              <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
