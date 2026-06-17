"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Building2, Bell, CreditCard, Link2, Globe, Copy } from "lucide-react"

type Business = { id: string; name: string; slug: string; category: string; description: string | null; website: string | null; timezone: string; currency: string }
type Subscription = { plan: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; flowCustomerId: string | null; trialEndsAt: string | null }

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [form, setForm] = useState({ name: "", description: "", website: "", timezone: "", currency: "" })
  const [saving, setSaving] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(async d => {
      const r = await fetch(`/api/businesses/${d.businessId}`)
      const biz = await r.json()
      setBusiness(biz.business)
      setSubscription(biz.subscription || null)
      setForm({ name: biz.business.name, description: biz.business.description || "", website: biz.business.website || "", timezone: biz.business.timezone, currency: biz.business.currency })
    })
  }, [])

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
    if (!confirm("¿Cancelar tu suscripcion? Volveras al plan Free al final del periodo.")) return
    const r = await fetch("/api/flow/cancel", { method: "POST" })
    if (r.ok) {
      toast.success("Suscripcion cancelada")
      setSubscription(s => s ? { ...s, cancelAtPeriodEnd: true } : s)
    } else {
      toast.error("Error al cancelar")
    }
  }

  const planInfo: Record<string, { label: string; desc: string; color: string }> = {
    FREE: { label: "Plan Inicial", desc: "Gratis 3 meses, luego $4.990/mes • Hasta 2 profesionales", color: "bg-green-500/15 border-green-400/20 text-green-300" },
    PRO: { label: "Plan Pro", desc: "Citas ilimitadas • 10 profesionales • Reportes avanzados", color: "bg-sky-500/15 border-sky-400/20 text-sky-300" },
    ENTERPRISE: { label: "Plan Enterprise", desc: "Todo ilimitado • Multi-sede • Soporte prioritario", color: "bg-purple-500/15 border-purple-400/20 text-purple-300" },
  }
  const currentPlan = subscription?.plan || "FREE"
  const info = planInfo[currentPlan]

  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null
  const trialExpired = trialDaysLeft !== null && trialDaysLeft === 0

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Configuracion</h1><p className="page-subtitle">Ajusta tu negocio y preferencias</p></div>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business" className="gap-2"><Building2 className="w-4 h-4" />Negocio</TabsTrigger>
          <TabsTrigger value="booking" className="gap-2"><Globe className="w-4 h-4" />Pagina de reservas</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" />Notificaciones</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2"><CreditCard className="w-4 h-4" />Plan y facturacion</TabsTrigger>
        </TabsList>

        {/* Business info */}
        <TabsContent value="business" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Informacion del negocio</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5"><Label>Nombre del negocio</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Descripcion</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Cuenta de que trata tu negocio..." /></div>
                <div className="space-y-1.5"><Label>Sitio web</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." /></div>
                <div className="space-y-1.5"><Label>Moneda</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="CLP" /></div>
              </div>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
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
  data-business="${business?.slug}"
  data-label="Reservar turno"
  data-color="#6366f1"
></script>`}
                </pre>
                <Button
                  size="sm" variant="secondary"
                  className="absolute top-2 right-2 h-7 text-xs gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(`<script\n  src="${origin}/widget.js"\n  data-business="${business?.slug}"\n  data-label="Reservar turno"\n  data-color="#6366f1"\n></script>`)
                    toast.success("Codigo copiado")
                  }}
                >
                  <Copy className="w-3 h-3" />Copiar
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="p-2 bg-muted/40 rounded-lg"><p className="font-medium text-foreground mb-0.5">data-label</p>Texto del boton</div>
                <div className="p-2 bg-muted/40 rounded-lg"><p className="font-medium text-foreground mb-0.5">data-color</p>Color del boton (hex)</div>
                <div className="p-2 bg-muted/40 rounded-lg"><p className="font-medium text-foreground mb-0.5">data-business</p>ID de tu negocio</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Notificaciones automaticas</CardTitle><CardDescription>Configura que mensajes reciben tus clientes</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Confirmacion de cita", desc: "Email al confirmar una reserva", active: true },
                { label: "Recordatorio 24h antes", desc: "Email y WhatsApp el dia anterior", active: true },
                { label: "Recordatorio 1h antes", desc: "WhatsApp una hora antes de la cita", active: false },
                { label: "Follow-up post-cita", desc: "Email pidiendo resena tras el servicio", active: false },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={n.active ? "default" : "secondary"}>{n.active ? "Activo" : "Inactivo"}</Badge>
                    <Button size="sm" variant="ghost">Editar</Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">Las integraciones de email (Resend) y WhatsApp (Twilio) se configuran en las variables de entorno.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="pt-4 space-y-4">
          {/* Current plan */}
          <Card>
            <CardHeader><CardTitle>Plan actual</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-center justify-between p-4 border rounded-xl ${info.color}`}>
                <div>
                  <p className="font-bold">{info.label}</p>
                  <p className="text-sm opacity-80">{info.desc}</p>
                  {currentPlan === "FREE" && trialDaysLeft !== null && trialDaysLeft > 0 && (
                    <p className="text-xs font-medium mt-1">
                      Periodo gratis: {trialDaysLeft} dias restantes
                    </p>
                  )}
                  {currentPlan === "FREE" && trialExpired && (
                    <p className="text-xs font-semibold text-red-600 mt-1">
                      Periodo de prueba vencido — activa tu plan para continuar
                    </p>
                  )}
                  {subscription?.currentPeriodEnd && currentPlan !== "FREE" && (
                    <p className="text-xs opacity-60 mt-1">
                      {subscription.cancelAtPeriodEnd ? "Cancela el" : "Renueva el"}{" "}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString("es-CL")}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">
                  {currentPlan === "FREE" && trialDaysLeft !== null && trialDaysLeft > 0 ? "Prueba gratuita" :
                   subscription?.status === "ACTIVE" ? "Activo" : subscription?.status || "Inicial"}
                </Badge>
              </div>
              {currentPlan !== "FREE" && !subscription?.cancelAtPeriodEnd && (
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={handleCancel}>
                  Cancelar suscripcion
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Activate Inicial after trial / upgrade */}
          {currentPlan === "FREE" && trialExpired && (
            <Card className="border-green-400/30 bg-green-500/10">
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="font-bold text-lg text-green-300">Activa el Plan Inicial</p>
                  <p className="text-sm text-green-400/80">Tu periodo de prueba termino. Activa tu plan para seguir usando AgendaMok.</p>
                  <p className="text-2xl font-bold text-green-300 mt-2">$4.990 <span className="text-sm font-normal">/mes</span></p>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700 gap-2" onClick={() => handleSubscribe("FREE")} disabled={subscribing}>
                  <CreditCard className="w-4 h-4" />
                  {subscribing ? "Procesando..." : "Activar Plan Inicial — $4.990/mes"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Plan options */}
          {currentPlan === "FREE" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pro */}
              <Card className="border-sky-400/30 bg-sky-500/5">
                <CardContent className="p-5 space-y-3">
                  <div>
                    <p className="font-bold text-lg">Plan Pro</p>
                    <p className="text-2xl font-bold text-sky-400 mt-1">$9.900 <span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>✓ Citas ilimitadas</li>
                    <li>✓ Hasta 10 profesionales</li>
                    <li>✓ Reportes avanzados</li>
                    <li>✓ Notificaciones automaticas</li>
                    <li>✓ Soporte por email</li>
                  </ul>
                  <Button className="w-full gap-2" onClick={() => handleSubscribe("PRO")} disabled={subscribing}>
                    <CreditCard className="w-4 h-4" />
                    {subscribing ? "Procesando..." : "Suscribirse — $9.900/mes"}
                  </Button>
                </CardContent>
              </Card>

              {/* Enterprise */}
              <Card className="border-purple-400/30 bg-purple-500/5">
                <CardContent className="p-5 space-y-3">
                  <div>
                    <p className="font-bold text-lg">Plan Enterprise</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">$29.900 <span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>✓ Todo lo del plan Pro</li>
                    <li>✓ Profesionales ilimitados</li>
                    <li>✓ Multi-sede</li>
                    <li>✓ API access</li>
                    <li>✓ Soporte prioritario</li>
                  </ul>
                  <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700" onClick={() => handleSubscribe("ENTERPRISE")} disabled={subscribing}>
                    <CreditCard className="w-4 h-4" />
                    {subscribing ? "Procesando..." : "Suscribirse — $29.900/mes"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Los pagos se procesan de forma segura a traves de Flow. Tu tarjeta se cobra automaticamente cada mes. Puedes cancelar en cualquier momento.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
