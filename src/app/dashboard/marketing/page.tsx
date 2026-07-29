"use client"

import { useState, useEffect } from "react"
import { useBusiness } from "@/contexts/business-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Megaphone, Gift, Tag, Zap, Plus, Send, ExternalLink, AlertCircle } from "lucide-react"
import Link from "next/link"

type GiftCard = { id: string; code: string; amount: number; balance: number; isActive: boolean; expiresAt: string | null; createdAt: string }
type Campaign = { id: string; name: string; subject: string; segment: string | null; sentAt: string | null; recipientCount: number; createdAt: string }
type LoyaltySettings = { loyaltyEnabled: boolean; loyaltyPointsPerVisit: number; loyaltyVipThreshold: number; segmentDiscounts: Record<string, number> }

export default function MarketingPage() {
  const { businessId } = useBusiness()
  const [campaignOpen, setCampaignOpen] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)

  const [discounts, setDiscounts] = useState<{ id: string; code: string; type: string; value: number; usedCount: number; maxUses: number | null; isActive: boolean }[]>([])
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loyalty, setLoyalty] = useState<LoyaltySettings | null>(null)

  const [campaign, setCampaign] = useState<{ name: string; subject: string; body: string; segment: string }>({ name: "", subject: "", body: "", segment: "" })
  const [discount, setDiscount] = useState({ code: "", type: "PERCENTAGE", value: 10, maxUses: "", expiresAt: "" })
  const [gift, setGift] = useState({ amount: "", expiresAt: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!businessId) return
    loadAll(businessId)
  }, [businessId])

  async function loadAll(bid: string) {
    const [discR, giftR, campR, bizR] = await Promise.all([
      fetch(`/api/businesses/${bid}/discounts`),
      fetch(`/api/businesses/${bid}/gift-cards`),
      fetch(`/api/businesses/${bid}/campaigns`),
      fetch(`/api/businesses/${bid}`),
    ])
    if (discR.ok) setDiscounts((await discR.json()).discounts || [])
    if (giftR.ok) setGiftCards((await giftR.json()).giftCards || [])
    if (campR.ok) setCampaigns((await campR.json()).campaigns || [])
    if (bizR.ok) {
      const biz = (await bizR.json()).business
      setLoyalty({
        loyaltyEnabled: biz.loyaltyEnabled ?? true,
        loyaltyPointsPerVisit: biz.loyaltyPointsPerVisit ?? 10,
        loyaltyVipThreshold: biz.loyaltyVipThreshold ?? 500,
        segmentDiscounts: (biz.segmentDiscounts ?? {}) as Record<string, number>,
      })
    }
  }

  async function sendCampaign() {
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/campaigns`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campaign),
    })
    const data = await r.json()
    if (r.ok) {
      toast.success(`Campaña enviada a ${data.sent} cliente${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? ` (${data.failed} fallidos)` : ""}`)
      setCampaignOpen(false)
      setCampaign({ name: "", subject: "", body: "", segment: "" })
      setCampaigns(prev => [data.campaign, ...prev])
    } else {
      toast.error(data.error || "Error al enviar campaña")
    }
    setSaving(false)
  }

  async function createDiscount() {
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/discounts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...discount, value: Number(discount.value), maxUses: discount.maxUses ? Number(discount.maxUses) : null }),
    })
    if (r.ok) { toast.success("Código creado"); setDiscountOpen(false); loadAll(businessId) }
    else { const d = await r.json(); toast.error(d.error || "Error") }
    setSaving(false)
  }

  async function createGiftCard() {
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/gift-cards`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(gift.amount), expiresAt: gift.expiresAt || null }),
    })
    if (r.ok) {
      const d = await r.json()
      toast.success(`Gift card creada: ${d.giftCard.code}`)
      setGiftOpen(false)
      setGift({ amount: "", expiresAt: "" })
      setGiftCards(prev => [d.giftCard, ...prev])
    } else {
      toast.error("Error al crear gift card")
    }
    setSaving(false)
  }

  const SEGMENT_LABELS: Record<string, string> = { VIP: "VIP", FREQUENT: "Frecuentes", AT_RISK: "En riesgo", NEW: "Nuevos", REGULAR: "Regulares", INFLUENCER: "Influencers" }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Marketing</h1><p className="page-subtitle">Campañas, descuentos y fidelización</p></div>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-2"><Megaphone className="w-4 h-4" />Campañas</TabsTrigger>
          <TabsTrigger value="discounts" className="gap-2"><Tag className="w-4 h-4" />Descuentos</TabsTrigger>
          <TabsTrigger value="gifts" className="gap-2"><Gift className="w-4 h-4" />Gift Cards</TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-2"><Zap className="w-4 h-4" />Fidelización</TabsTrigger>
        </TabsList>

        {/* Campaigns */}
        <TabsContent value="campaigns" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Enviá emails segmentados a tus clientes</p>
            <Button onClick={() => setCampaignOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Nueva campaña</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Clientes VIP", desc: "Premiá a tus mejores clientes con ofertas exclusivas", segment: "VIP", color: "bg-purple-500/10 border-purple-400/20" },
              { title: "En riesgo", desc: "Recuperá clientes que no reservan hace 60+ días", segment: "AT_RISK", color: "bg-orange-500/10 border-orange-400/20" },
              { title: "Nuevos", desc: "Dales la bienvenida a tus nuevos clientes", segment: "NEW", color: "bg-sky-500/10 border-sky-400/20" },
            ].map(t => (
              <Card key={t.title} className={`border ${t.color}`}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{t.title}</CardTitle><CardDescription className="text-xs">{t.desc}</CardDescription></CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => { setCampaign(c => ({ ...c, segment: t.segment })); setCampaignOpen(true) }}>
                    <Send className="w-3 h-3" />Enviar campaña
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {campaigns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Enviadas</p>
              <div className="bg-white rounded-xl border overflow-hidden">
                {campaigns.map((c, i) => (
                  <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i !== campaigns.length - 1 ? "border-b" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                    </div>
                    {c.segment && <Badge variant="outline" className="text-xs shrink-0">{SEGMENT_LABELS[c.segment] ?? c.segment}</Badge>}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{c.recipientCount}</p>
                      <p className="text-xs text-muted-foreground">enviados</p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {c.sentAt ? new Date(c.sentAt).toLocaleDateString("es-CL") : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Discounts */}
        <TabsContent value="discounts" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Códigos de descuento para tus clientes</p>
            <Button onClick={() => setDiscountOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Nuevo código</Button>
          </div>
          {discounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay códigos de descuento aún</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              {discounts.map((d, i) => (
                <div key={d.id} className={`flex items-center gap-4 px-4 py-3 ${i !== discounts.length - 1 ? "border-b" : ""}`}>
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono font-bold">{d.code}</code>
                  <div className="flex-1">
                    <span className="text-sm">{d.type === "PERCENTAGE" ? `${d.value}% de descuento` : `$${d.value} de descuento`}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{d.usedCount}{d.maxUses ? `/${d.maxUses}` : ""} usos</span>
                  <Badge variant={d.isActive ? "default" : "secondary"}>{d.isActive ? "Activo" : "Inactivo"}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Gift cards */}
        <TabsContent value="gifts" className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Crea gift cards para vender o regalar</p>
            <Button onClick={() => setGiftOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Nueva gift card</Button>
          </div>
          {giftCards.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Crea tu primera gift card</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              {giftCards.map((g, i) => {
                const pct = g.amount > 0 ? Math.round((Number(g.balance) / Number(g.amount)) * 100) : 0
                return (
                  <div key={g.id} className={`flex items-center gap-4 px-4 py-3 ${i !== giftCards.length - 1 ? "border-b" : ""}`}>
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono font-bold shrink-0">{g.code}</code>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">${Number(g.balance).toLocaleString("es-CL")}</p>
                        <span className="text-xs text-muted-foreground">de ${Number(g.amount).toLocaleString("es-CL")}</span>
                      </div>
                      <div className="h-1.5 mt-1 rounded-full bg-muted overflow-hidden w-28">
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {g.expiresAt && (
                      <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        Vence {new Date(g.expiresAt).toLocaleDateString("es-CL")}
                      </p>
                    )}
                    <Badge variant={g.isActive ? "default" : "secondary"}>{g.isActive ? "Activa" : "Inactiva"}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Loyalty */}
        <TabsContent value="loyalty" className="pt-4">
          {loyalty === null ? null : !loyalty.loyaltyEnabled ? (
            <Card className="border-orange-400/20 bg-orange-500/5">
              <CardContent className="pt-5 pb-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Fidelización desactivada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    El programa de puntos está apagado. Los clientes no ven ni acumulan puntos.
                  </p>
                  <Link href="/dashboard/settings?tab=loyalty">
                    <Button size="sm" variant="outline" className="mt-3 gap-1.5 text-xs">
                      <ExternalLink className="w-3 h-3" />Activar en Configuración
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Puntos por turno completado</p>
                  <p className="text-2xl font-bold">{loyalty.loyaltyPointsPerVisit}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Puntos para VIP automático</p>
                  <p className="text-2xl font-bold">{loyalty.loyaltyVipThreshold}</p>
                </div>
              </div>

              {Object.entries(loyalty.segmentDiscounts).some(([, v]) => v > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Descuentos por segmento</CardTitle>
                    <CardDescription className="text-xs">Se muestran en el perfil del cliente. No se aplican automáticamente al booking.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(loyalty.segmentDiscounts)
                      .filter(([, v]) => v > 0)
                      .map(([seg, val]) => (
                        <div key={seg} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{SEGMENT_LABELS[seg] ?? seg}</span>
                          <Badge variant="secondary">{val}% descuento</Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              <Link href="/dashboard/settings?tab=loyalty">
                <Button variant="outline" className="w-full gap-2">
                  <ExternalLink className="w-4 h-4" />Configurar programa de puntos
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Campaign dialog */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva campaña de email</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5"><Label>Nombre de la campaña</Label><Input value={campaign.name} onChange={e => setCampaign(c => ({ ...c, name: e.target.value }))} placeholder="Ej: Promo de verano" /></div>
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <Select value={campaign.segment} onValueChange={v => setCampaign(c => ({ ...c, segment: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="Todos los clientes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="FREQUENT">Frecuentes</SelectItem>
                  <SelectItem value="AT_RISK">En riesgo</SelectItem>
                  <SelectItem value="NEW">Nuevos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Asunto del email</Label><Input value={campaign.subject} onChange={e => setCampaign(c => ({ ...c, subject: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Mensaje</Label><Textarea value={campaign.body} onChange={e => setCampaign(c => ({ ...c, body: e.target.value }))} rows={5} placeholder="Escribe aquí el contenido del email..." /></div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 gap-2" onClick={sendCampaign} disabled={saving || !campaign.name || !campaign.subject || !campaign.body}>
                <Send className="w-4 h-4" />{saving ? "Enviando..." : "Enviar campaña"}
              </Button>
              <Button variant="outline" onClick={() => setCampaignOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount dialog */}
      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo código de descuento</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5"><Label>Código *</Label><Input value={discount.code} onChange={e => setDiscount(d => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="PROMO20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={discount.type} onValueChange={v => setDiscount(d => ({ ...d, type: v ?? "PERCENTAGE" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Porcentaje (%)</SelectItem>
                    <SelectItem value="FLAT">Monto fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Valor *</Label><Input type="number" value={discount.value} onChange={e => setDiscount(d => ({ ...d, value: +e.target.value }))} min={1} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Usos máximos</Label><Input type="number" value={discount.maxUses} onChange={e => setDiscount(d => ({ ...d, maxUses: e.target.value }))} placeholder="Ilimitado" /></div>
              <div className="space-y-1.5"><Label>Vence</Label><Input type="date" value={discount.expiresAt} onChange={e => setDiscount(d => ({ ...d, expiresAt: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={createDiscount} disabled={saving || !discount.code}>{saving ? "Creando..." : "Crear código"}</Button>
              <Button variant="outline" onClick={() => setDiscountOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gift card dialog */}
      <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nueva gift card</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5"><Label>Monto *</Label><Input type="number" value={gift.amount} onChange={e => setGift(g => ({ ...g, amount: e.target.value }))} placeholder="5000" /></div>
            <div className="space-y-1.5"><Label>Fecha de vencimiento</Label><Input type="date" value={gift.expiresAt} onChange={e => setGift(g => ({ ...g, expiresAt: e.target.value }))} /></div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={createGiftCard} disabled={saving || !gift.amount}>{saving ? "Creando..." : "Crear gift card"}</Button>
              <Button variant="outline" onClick={() => setGiftOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
