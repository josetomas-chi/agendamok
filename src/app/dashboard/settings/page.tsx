"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Building2, Bell, CreditCard, Link2, Globe, Copy, Navigation, MapPin, Key, Plus, Trash2, Eye, EyeOff, Banknote } from "lucide-react"

type Business = { id: string; name: string; slug: string; category: string; description: string | null; website: string | null; phone: string | null; address: string | null; city: string | null; latitude: number | null; longitude: number | null; timezone: string; currency: string; clinicalRecordEnabled: boolean; cancellationHoursNotice: number | null; dailySummaryEnabled: boolean }
type PaymentSettings = { onlinePaymentsEnabled: boolean; hasCredentials: boolean }
type Subscription = { plan: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; flowCustomerId: string | null; trialEndsAt: string | null }

function SettingsContent() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [form, setForm] = useState({ name: "", description: "", website: "", phone: "", address: "", city: "", timezone: "", currency: "" })
  const [clinicalEnabled, setClinicalEnabled] = useState(false)
  const [cancellationHours, setCancellationHours] = useState<string>("")
  const [dailySummary, setDailySummary] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)

  // Google Calendar
  const [gcal, setGcal] = useState<{ connected: boolean; connectedAt: string | null }>({ connected: false, connectedAt: null })
  const [gcalLoading, setGcalLoading] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const gcalStatus = searchParams.get("gcal")
    if (gcalStatus === "success") toast.success("Google Calendar conectado")
    if (gcalStatus === "error") toast.error("Error al conectar Google Calendar")
  }, [])
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  // Payment settings (business Flow credentials)
  const [paySettings, setPaySettings] = useState<PaymentSettings>({ onlinePaymentsEnabled: false, hasCredentials: false })
  const [payForm, setPayForm] = useState({ flowApiKey: "", flowSecretKey: "" })
  const [savingPay, setSavingPay] = useState(false)
  const [showPaySecret, setShowPaySecret] = useState(false)

  // API Keys
  type ApiKey = { id: string; name: string; key: string; isActive: boolean; lastUsedAt: string | null; createdAt: string }
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [newKeyName, setNewKeyName] = useState("")
  const [creatingKey, setCreatingKey] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(async d => {
      const r = await fetch(`/api/businesses/${d.businessId}`)
      const biz = await r.json()
      setBusiness(biz.business)
      setSubscription(biz.subscription || null)
      setForm({ name: biz.business.name, description: biz.business.description || "", website: biz.business.website || "", phone: biz.business.phone || "", address: biz.business.address || "", city: biz.business.city || "", timezone: biz.business.timezone, currency: biz.business.currency })
      setClinicalEnabled(biz.business.clinicalRecordEnabled ?? false)
      setCancellationHours(biz.business.cancellationHoursNotice?.toString() ?? "")
      setDailySummary(biz.business.dailySummaryEnabled ?? false)
      // Load Google Calendar status
      const gcalR = await fetch("/api/integrations/google-calendar/status")
      if (gcalR.ok) setGcal(await gcalR.json())
      // Load API keys
      const kr = await fetch(`/api/businesses/${d.businessId}/api-keys`)
      const kd = await kr.json()
      setApiKeys(kd.keys || [])
      // Load payment settings
      const pr = await fetch(`/api/businesses/${d.businessId}/payment-settings`)
      if (pr.ok) {
        const pd = await pr.json()
        setPaySettings(pd)
      }
    })
  }, [])

  async function createApiKey() {
    if (!business) return
    setCreatingKey(true)
    const r = await fetch(`/api/businesses/${business.id}/api-keys`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName || "Default" }),
    })
    if (r.ok) {
      const d = await r.json()
      setApiKeys(prev => [d.apiKey, ...prev])
      setVisibleKeys(prev => new Set([...prev, d.apiKey.id]))
      setNewKeyName("")
      toast.success("API key creada")
    }
    setCreatingKey(false)
  }

  async function deleteApiKey(keyId: string) {
    if (!business || !confirm("Eliminar esta API key?")) return
    await fetch(`/api/businesses/${business.id}/api-keys/${keyId}`, { method: "DELETE" })
    setApiKeys(prev => prev.filter(k => k.id !== keyId))
    toast.success("API key eliminada")
  }

  function toggleKeyVisibility(keyId: string) {
    setVisibleKeys(prev => {
      const next = new Set(prev)
      if (next.has(keyId)) next.delete(keyId); else next.add(keyId)
      return next
    })
  }

  async function savePaymentSettings() {
    if (!business) return
    setSavingPay(true)
    const body: Record<string, unknown> = { onlinePaymentsEnabled: paySettings.onlinePaymentsEnabled }
    if (payForm.flowApiKey) body.flowApiKey = payForm.flowApiKey
    if (payForm.flowSecretKey) body.flowSecretKey = payForm.flowSecretKey
    const r = await fetch(`/api/businesses/${business.id}/payment-settings`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (r.ok) {
      const d = await r.json()
      setPaySettings(d)
      setPayForm({ flowApiKey: "", flowSecretKey: "" })
      toast.success("Configuración de cobros guardada")
    } else {
      toast.error("Error al guardar")
    }
    setSavingPay(false)
  }

  async function clearPaymentCredentials() {
    if (!business || !confirm("¿Eliminar las credenciales de Flow? Esto deshabilitará los cobros online.")) return
    const r = await fetch(`/api/businesses/${business.id}/payment-settings`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearCredentials: true }),
    })
    if (r.ok) {
      setPaySettings({ onlinePaymentsEnabled: false, hasCredentials: false })
      toast.success("Credenciales eliminadas")
    }
  }

  async function handleSave() {
    if (!business) return
    setSaving(true)
    const r = await fetch(`/api/businesses/${business.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (r.ok) toast.success("Cambios guardados")
    else toast.error("Error al guardar")
    setSaving(false)
  }

  async function useMyLocation() {
    if (!business) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        await fetch(`/api/businesses/${business.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude }),
        })
        toast.success("Ubicación guardada")
        setLocating(false)
      },
      () => { toast.error("No se pudo obtener la ubicación"); setLocating(false) }
    )
  }

  const [origin, setOrigin] = useState("")
  useEffect(() => { setOrigin(window.location.origin) }, [])
  const bookingUrl = `${origin}/book/${business?.slug}`

  async function handleSubscribe(plan: string) {
    setSubscribing(true)
    const r = await fetch("/api/flow/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    })
    const d = await r.json()
    if (d.url) {
      window.location.href = d.url
    } else {
      toast.error(d.error || "Error al procesar")
      setSubscribing(false)
    }
  }

  async function handleCancel() {
    if (!confirm("¿Cancelar tu suscripción? El plan se mantendrá activo hasta el fin del periodo pagado.")) return
    const r = await fetch("/api/flow/cancel", { method: "POST" })
    if (r.ok) {
      toast.success("Suscripción cancelada")
      setSubscription(s => s ? { ...s, cancelAtPeriodEnd: true } : s)
    } else {
      toast.error("Error al cancelar")
    }
  }

  const PLAN_INFO: Record<string, { label: string; price: string; features: string[]; color: string; btnColor: string }> = {
    STARTER: {
      label: "Starter",
      price: "$9.900/mes",
      features: ["1 profesional", "Turnos ilimitados", "Booking online 24/7", "CRM de clientes", "Pagos online y POS", "Recordatorios por email"],
      color: "bg-white/5 border-white/20 text-white",
      btnColor: "bg-white/10 hover:bg-white/20",
    },
    NEGOCIO: {
      label: "Negocio",
      price: "$24.900/mes",
      features: ["Hasta 5 profesionales", "Todo lo del plan Starter", "Encuestas de satisfacción", "Comisiones de staff", "2.000 emails marketing/mes", "Soporte por chat"],
      color: "bg-sky-500/10 border-sky-400/40 text-sky-300",
      btnColor: "bg-sky-500 hover:bg-sky-400",
    },
    PRO: {
      label: "Pro",
      price: "$39.900/mes",
      features: ["Profesionales ilimitados", "Todo lo del plan Negocio", "Ficha clínica", "Presupuestos y cotizaciones", "Múltiples sedes", "API access"],
      color: "bg-purple-500/10 border-purple-400/40 text-purple-300",
      btnColor: "bg-purple-600 hover:bg-purple-500",
    },
  }

  const currentPlan = (subscription?.plan || "STARTER") as keyof typeof PLAN_INFO
  const info = PLAN_INFO[currentPlan] ?? PLAN_INFO.STARTER

  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null
  const trialExpired = trialDaysLeft !== null && trialDaysLeft === 0

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Configuracion</h1><p className="page-subtitle">Ajusta tu negocio y preferencias</p></div>
      </div>

      <Tabs defaultValue="business">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="business" className="gap-2"><Building2 className="w-4 h-4" />Negocio</TabsTrigger>
            <TabsTrigger value="booking" className="gap-2"><Globe className="w-4 h-4" />Reservas</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" />Avisos</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2"><Link2 className="w-4 h-4" />Integraciones</TabsTrigger>
            <TabsTrigger value="payments" className="gap-2"><Banknote className="w-4 h-4" />Cobros</TabsTrigger>
            <TabsTrigger value="billing" className="gap-2"><CreditCard className="w-4 h-4" />Plan</TabsTrigger>
            <TabsTrigger value="api" className="gap-2"><Key className="w-4 h-4" />API</TabsTrigger>
          </TabsList>
        </div>

        {/* Business info */}
        <TabsContent value="business" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Informacion del negocio</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5"><Label>Nombre del negocio</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Descripcion</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Cuenta de que trata tu negocio..." /></div>
                <div className="space-y-1.5"><Label>Sitio web</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." /></div>
                <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+56 9 1234 5678" /></div>
                <div className="space-y-1.5"><Label>Moneda</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="CLP" /></div>
              </div>
              {/* Clinical record toggle */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 p-4">
                <div>
                  <p className="text-sm font-medium text-white">Ficha clínica de pacientes</p>
                  <p className="text-xs text-white/40 mt-0.5">Actívala si tu negocio pertenece al área de la salud</p>
                </div>
                <button
                  onClick={async () => {
                    if (!business) return
                    const next = !clinicalEnabled
                    setClinicalEnabled(next)
                    await fetch(`/api/businesses/${business.id}`, {
                      method: "PATCH", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clinicalRecordEnabled: next }),
                    })
                    toast.success(next ? "Ficha clínica activada" : "Ficha clínica desactivada")
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${clinicalEnabled ? "bg-sky-500" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${clinicalEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>

              {/* Location section */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Ubicación del negocio</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Necesaria para aparecer en búsquedas por cercanía en <strong>agendamok.com/buscar</strong></p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Dirección</Label>
                    <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Av. Providencia 1234" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ciudad</Label>
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Santiago" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" className="gap-2" onClick={useMyLocation} disabled={locating}>
                    <Navigation className="w-4 h-4" />
                    {locating ? "Obteniendo ubicación..." : business?.latitude ? "Actualizar coordenadas GPS" : "Fijar mi ubicación GPS"}
                  </Button>
                  {business?.latitude && (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Coordenadas guardadas ({business.latitude.toFixed(4)}, {business.longitude?.toFixed(4)})
                    </p>
                  )}
                </div>
                <Button variant="secondary" onClick={handleSave} disabled={saving} size="sm">Guardar dirección</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking page */}
        <TabsContent value="booking" className="pt-4 space-y-4">
          {/* Link directo */}
          <Card>
            <CardHeader>
              <CardTitle>Tu pagina de reservas</CardTitle>
              <CardDescription>Comparte este link con tus clientes o ponlo en tu bio de Instagram, WhatsApp, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input value={bookingUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success("Link copiado") }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => window.open(bookingUrl, "_blank")}>
                <Link2 className="w-4 h-4" />Ver mi pagina de reservas
              </Button>
            </CardContent>
          </Card>

          {/* iframe embed */}
          <Card>
            <CardHeader>
              <CardTitle>Integrar en tu web (iframe)</CardTitle>
              <CardDescription>Pega este codigo en cualquier pagina de tu sitio web. Funciona en WordPress, Wix, Squarespace, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <pre className="bg-gray-950 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
{`<iframe
  src="${bookingUrl}?embed=1"
  width="100%"
  height="700px"
  frameborder="0"
  style="border-radius:12px"
></iframe>`}
                </pre>
                <Button
                  size="sm" variant="secondary"
                  className="absolute top-2 right-2 h-7 text-xs gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(`<iframe\n  src="${bookingUrl}?embed=1"\n  width="100%"\n  height="700px"\n  frameborder="0"\n  style="border-radius:12px"\n></iframe>`)
                    toast.success("Codigo copiado")
                  }}
                >
                  <Copy className="w-3 h-3" />Copiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Widget JS */}
          <Card>
            <CardHeader>
              <CardTitle>Boton flotante para tu web</CardTitle>
              <CardDescription>Un boton "Reservar turno" que aparece en el corner de tu web y abre el formulario en un modal. Pega este codigo antes del cierre de tu tag &lt;/body&gt;.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <pre className="bg-gray-950 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
{`<script
  src="${origin}/widget.js"
  data-slug="${business?.slug}"
  data-label="Reservar hora"
  data-color="#0ea5e9"
></script>`}
                </pre>
                <Button
                  size="sm" variant="secondary"
                  className="absolute top-2 right-2 h-7 text-xs gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(`<script\n  src="${origin}/widget.js"\n  data-slug="${business?.slug}"\n  data-label="Reservar hora"\n  data-color="#0ea5e9"\n></script>`)
                    toast.success("Codigo copiado")
                  }}
                >
                  <Copy className="w-3 h-3" />Copiar
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="p-2 bg-muted/40 rounded-lg"><p className="font-medium text-foreground mb-0.5">data-label</p>Texto del boton</div>
                <div className="p-2 bg-muted/40 rounded-lg"><p className="font-medium text-foreground mb-0.5">data-color</p>Color del boton (hex)</div>
                <div className="p-2 bg-muted/40 rounded-lg"><p className="font-medium text-foreground mb-0.5">data-slug</p>ID de tu negocio</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API */}
        <TabsContent value="api" className="pt-4 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Usa estas keys para conectar AgendaMok con tu propia web, app o sistemas externos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create new key */}
              <div className="flex gap-2">
                <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Nombre de la key (ej: Mi web)" />
                <Button onClick={createApiKey} disabled={creatingKey} className="gap-2 flex-shrink-0">
                  <Plus className="w-4 h-4" /> {creatingKey ? "Creando..." : "Crear key"}
                </Button>
              </div>
              {/* Keys list */}
              {apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay API keys. Crea una para empezar.</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map(k => (
                    <div key={k.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-medium text-sm">{k.name}</span>
                        <div className="flex items-center gap-2">
                          {k.lastUsedAt && <span className="text-xs text-white/30">Usado hace poco</span>}
                          <button onClick={() => toggleKeyVisibility(k.id)} className="text-white/30 hover:text-white transition-colors">
                            {visibleKeys.has(k.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button onClick={() => deleteApiKey(k.id)} className="text-white/30 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <code className="flex-1 text-xs bg-black/30 rounded-lg px-3 py-2 text-green-400 font-mono truncate">
                          {visibleKeys.has(k.id) ? k.key : k.key.slice(0, 8) + "••••••••••••••••••••••••••••••••"}
                        </code>
                        <Button size="sm" variant="outline" className="h-8 px-2.5 flex-shrink-0"
                          onClick={() => { navigator.clipboard.writeText(k.key); toast.success("Key copiada") }}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Endpoints reference */}
          <Card>
            <CardHeader>
              <CardTitle>Endpoints disponibles</CardTitle>
              <CardDescription>Incluye el header <code className="text-sky-400">x-api-key: {"<tu key>"}</code> en cada request.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { method: "GET", path: "/api/v1/services", desc: "Lista de servicios activos" },
                  { method: "GET", path: "/api/v1/availability?serviceId=&date=", desc: "Slots disponibles para un servicio en una fecha" },
                  { method: "GET", path: "/api/v1/appointments?from=&to=", desc: "Turnos en un rango de fechas (max 100)" },
                  { method: "POST", path: "/api/v1/appointments", desc: "Crear un nuevo turno" },
                  { method: "GET", path: "/api/v1/clients?q=", desc: "Buscar clientes" },
                ].map(({ method, path, desc }) => (
                  <div key={path} className="flex items-start gap-3 text-sm">
                    <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded font-mono ${
                      method === "GET" ? "bg-sky-500/20 text-sky-300" : "bg-green-500/20 text-green-300"
                    }`}>{method}</span>
                    <div>
                      <code className="text-xs text-white/70 font-mono">{path}</code>
                      <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="pt-4 space-y-4">
          {/* Status */}
          <Card>
            <CardHeader><CardTitle>Notificaciones automáticas</CardTitle><CardDescription>Mensajes que se envían sin intervención manual</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Confirmación de turno", desc: "Email al cliente cuando se confirma la reserva", active: true },
                { label: "Recordatorio 24h antes", desc: "WhatsApp + email el día anterior al turno", active: true },
                { label: "Recordatorio 1h antes", desc: "WhatsApp + email una hora antes del turno", active: true },
                { label: "Alerta de nueva reserva al negocio", desc: "Email al dueño cuando un cliente reserva", active: true },
                { label: "Alerta de cancelación al negocio", desc: "Email al dueño cuando un cliente cancela", active: true },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Activo</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Daily summary */}
          <Card>
            <CardHeader><CardTitle>Resumen diario</CardTitle><CardDescription>Recibe un email cada mañana con los turnos del día</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Resumen matutino</p>
                  <p className="text-xs text-muted-foreground">Llega a las 8 AM con la agenda del día</p>
                </div>
                <button
                  onClick={() => setDailySummary(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dailySummary ? "bg-sky-500" : "bg-slate-600"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dailySummary ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Cancellation policy */}
          <Card>
            <CardHeader><CardTitle>Política de cancelación</CardTitle><CardDescription>Define hasta cuánto tiempo antes puede cancelar un cliente</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="cancellation-hours">Horas mínimas de anticipación</Label>
                  <p className="text-xs text-muted-foreground mb-2">El link de cancelación del email se bloqueará si ya pasó este plazo</p>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cancellation-hours"
                      type="number"
                      min="1"
                      max="168"
                      placeholder="Ej: 24"
                      value={cancellationHours}
                      onChange={e => setCancellationHours(e.target.value)}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">horas antes</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Dejar vacío = sin límite de cancelación (el cliente puede cancelar hasta el último momento)</p>
            </CardContent>
          </Card>

          <Button
            onClick={async () => {
              if (!business) return
              setSavingNotif(true)
              try {
                await fetch(`/api/businesses/${business.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dailySummaryEnabled: dailySummary,
                    cancellationHoursNotice: cancellationHours ? parseInt(cancellationHours) : null,
                  }),
                })
                toast.success("Configuración guardada")
              } catch {
                toast.error("Error al guardar")
              } finally {
                setSavingNotif(false)
              }
            }}
            disabled={savingNotif}
          >
            {savingNotif ? "Guardando..." : "Guardar configuración"}
          </Button>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="pt-4 space-y-4">
          {/* Current plan */}
          <Card>
            <CardHeader><CardTitle>Plan actual</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-center justify-between p-4 border rounded-xl ${info.color}`}>
                <div>
                  <p className="font-bold text-lg">Plan {info.label}</p>
                  <p className="text-sm opacity-70">{info.price} + IVA</p>
                  {trialDaysLeft !== null && trialDaysLeft > 0 && (
                    <p className="text-xs font-medium mt-1 text-sky-300">
                      Prueba gratuita: {trialDaysLeft} días restantes
                    </p>
                  )}
                  {trialExpired && subscription?.status !== "ACTIVE" && (
                    <p className="text-xs font-semibold text-red-400 mt-1">
                      Periodo de prueba vencido — activa tu plan para continuar
                    </p>
                  )}
                  {subscription?.currentPeriodEnd && subscription.status === "ACTIVE" && (
                    <p className="text-xs opacity-60 mt-1">
                      {subscription.cancelAtPeriodEnd ? "Cancela el" : "Renueva el"}{" "}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString("es-CL")}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">
                  {trialDaysLeft !== null && trialDaysLeft > 0 ? "Prueba gratuita" :
                   subscription?.status === "ACTIVE" ? "Activo" :
                   subscription?.status === "PAST_DUE" ? "Pago pendiente" :
                   subscription?.status === "CANCELED" ? "Cancelado" : "Sin suscripción"}
                </Badge>
              </div>
              {subscription?.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && (
                <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300 border-red-400/30" onClick={handleCancel}>
                  Cancelar suscripción
                </Button>
              )}
              {subscription?.cancelAtPeriodEnd && (
                <p className="text-xs text-amber-400">Tu plan se cancela al fin del periodo. Hasta entonces puedes seguir usándolo.</p>
              )}
            </CardContent>
          </Card>

          {/* Plan cards — show all, highlight current, allow switching */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(PLAN_INFO) as [string, typeof PLAN_INFO[string]][]).map(([key, plan]) => {
              const isCurrent = key === currentPlan && subscription?.status === "ACTIVE"
              return (
                <Card key={key} className={`relative border ${isCurrent ? "border-sky-400/50 bg-sky-500/5" : "border-white/10 bg-white/[0.02]"}`}>
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-sky-500 rounded-full text-xs font-semibold text-white">
                      Plan actual
                    </div>
                  )}
                  <CardContent className="p-5 space-y-3 pt-6">
                    <div>
                      <p className="font-bold text-lg text-white">Plan {plan.label}</p>
                      <p className="text-2xl font-bold text-sky-400 mt-1">
                        {plan.price.split("/")[0]} <span className="text-sm font-normal text-white/40">/mes + IVA</span>
                      </p>
                    </div>
                    <ul className="text-sm space-y-1.5 text-white/60">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <span className="text-sky-400">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && (
                      <Button
                        className={`w-full gap-2 text-white ${plan.btnColor}`}
                        onClick={() => handleSubscribe(key)}
                        disabled={subscribing}
                      >
                        <CreditCard className="w-4 h-4" />
                        {subscribing ? "Procesando..." : `Activar Plan ${plan.label}`}
                      </Button>
                    )}
                    {isCurrent && (
                      <div className="text-center text-sm text-sky-400 py-2">✓ Plan activo</div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <p className="text-xs text-white/30">
            Pagos procesados de forma segura a través de Flow. Tu tarjeta se registra una vez y los cobros son automáticos cada mes. Puedes cancelar en cualquier momento desde esta pantalla.
          </p>
        </TabsContent>

        {/* Cobros online tab */}
        <TabsContent value="payments" className="pt-4 space-y-5">
          <Card className="bg-[#2c2c30] border-white/10">
            <CardHeader>
              <CardTitle className="text-base">Cobros online a tus clientes</CardTitle>
              <CardDescription className="text-white/40">
                Permite que tus clientes paguen su turno al reservar online. Necesitás una cuenta en{" "}
                <a href="https://www.flow.cl" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">Flow.cl</a>{" "}
                con las credenciales de producción de tu comercio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Status */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Cobros online</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {paySettings.hasCredentials ? "Credenciales configuradas" : "Sin credenciales — configura abajo"}
                  </p>
                </div>
                <button
                  onClick={() => setPaySettings(s => ({ ...s, onlinePaymentsEnabled: !s.onlinePaymentsEnabled }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${paySettings.onlinePaymentsEnabled && paySettings.hasCredentials ? "bg-sky-500" : "bg-white/10"}`}
                  disabled={!paySettings.hasCredentials}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${paySettings.onlinePaymentsEnabled && paySettings.hasCredentials ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Credentials form */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-white/80">Credenciales Flow de tu comercio</p>
                <div>
                  <Label className="text-white/50 text-xs mb-1.5 block">API Key</Label>
                  <Input
                    value={payForm.flowApiKey}
                    onChange={e => setPayForm(f => ({ ...f, flowApiKey: e.target.value }))}
                    placeholder={paySettings.hasCredentials ? "••••••••••••••••••••• (ya configurada)" : "Tu API Key de Flow"}
                    className="bg-[#3a3a3c] border-white/10 text-white placeholder:text-white/25"
                  />
                </div>
                <div>
                  <Label className="text-white/50 text-xs mb-1.5 block">Secret Key</Label>
                  <div className="relative">
                    <Input
                      type={showPaySecret ? "text" : "password"}
                      value={payForm.flowSecretKey}
                      onChange={e => setPayForm(f => ({ ...f, flowSecretKey: e.target.value }))}
                      placeholder={paySettings.hasCredentials ? "••••••••••••••••••••• (ya configurada)" : "Tu Secret Key de Flow"}
                      className="bg-[#3a3a3c] border-white/10 text-white placeholder:text-white/25 pr-10"
                    />
                    <button type="button" onClick={() => setShowPaySecret(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                      {showPaySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={savePaymentSettings} disabled={savingPay} className="flex-1">
                  {savingPay ? "Guardando..." : "Guardar configuración"}
                </Button>
                {paySettings.hasCredentials && (
                  <Button variant="outline" onClick={clearPaymentCredentials} className="text-red-400 border-red-400/20 hover:bg-red-500/10">
                    Eliminar credenciales
                  </Button>
                )}
              </div>

              <div className="bg-sky-500/5 border border-sky-400/20 rounded-xl p-4 text-xs text-white/50 space-y-1">
                <p className="font-medium text-sky-300">¿Cómo obtener tus credenciales?</p>
                <p>1. Ingresa a tu cuenta de Flow.cl → Panel de comercio → Integración</p>
                <p>2. Copia tu <strong className="text-white/70">API Key</strong> y <strong className="text-white/70">Secret Key</strong> de producción</p>
                <p>3. Pégalos arriba y guarda. Tus clientes podrán pagar al reservar y el dinero llega directamente a tu cuenta Flow.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="pt-4 space-y-4">
          <Card className="bg-[#2c2c30] border-white/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                </span>
                Google Calendar
              </CardTitle>
              <CardDescription className="text-white/40">
                Sincroniza tus turnos automáticamente con Google Calendar. Cada reserva nueva crea un evento y cada cancelación lo elimina.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Estado de la conexión</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {gcal.connected
                      ? `Conectado${gcal.connectedAt ? ` desde ${new Date(gcal.connectedAt).toLocaleDateString("es-CL")}` : ""}`
                      : "No conectado"}
                  </p>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${gcal.connected ? "bg-emerald-400" : "bg-slate-600"}`} />
              </div>

              {gcal.connected ? (
                <div className="space-y-3">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-xs text-white/50 space-y-1">
                    <p className="font-medium text-emerald-400">✓ Sincronización activa</p>
                    <p>Los nuevos turnos se agregan automáticamente a tu Google Calendar principal.</p>
                    <p>Las cancelaciones eliminan el evento correspondiente.</p>
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-400 border-red-400/20 hover:bg-red-500/10"
                    disabled={gcalLoading}
                    onClick={async () => {
                      setGcalLoading(true)
                      await fetch("/api/integrations/google-calendar/status", { method: "DELETE" })
                      setGcal({ connected: false, connectedAt: null })
                      setGcalLoading(false)
                      toast.success("Google Calendar desconectado")
                    }}
                  >
                    {gcalLoading ? "Desconectando..." : "Desconectar Google Calendar"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-sky-500/5 border border-sky-400/20 rounded-xl p-4 text-xs text-white/50 space-y-1">
                    <p className="font-medium text-sky-300">¿Cómo funciona?</p>
                    <p>1. Haz clic en &quot;Conectar&quot; y autoriza el acceso a tu Google Calendar</p>
                    <p>2. Los turnos se sincronizarán automáticamente desde ese momento</p>
                    <p>3. Puedes desconectar en cualquier momento sin perder datos</p>
                  </div>
                  <Button
                    onClick={() => { window.location.href = "/api/integrations/google-calendar/authorize" }}
                    disabled={gcalLoading}
                    className="bg-white text-gray-800 hover:bg-gray-100 gap-2"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Conectar con Google Calendar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
