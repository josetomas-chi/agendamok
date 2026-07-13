"use client"

import { useState, useEffect } from "react"
import { useBusiness } from "@/contexts/business-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { CreditCard, Banknote, Smartphone, DollarSign, CheckCircle2, FileText, ExternalLink, Loader2, TrendingUp, CalendarDays } from "lucide-react"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Appointment = {
  id: string; startTime: string; status: string; price?: number | null
  service: { name: string; price: number; color: string }
  staff: { user: { name: string | null } }
  client: { name: string }
  payment: { amount: number; status: string; method: string } | null
}

type CourtBooking = {
  id: string; startTime: string; endTime: string; price: string; status: string; notes: string | null
  court: { id: string; name: string; sport: string | null; color: string }
  client: { id: string; name: string } | null
  payment: { amount: string; method: string; paidAt: string } | null
}

const METHODS = [
  { id: "CASH", label: "Efectivo", icon: Banknote },
  { id: "CARD", label: "Tarjeta", icon: CreditCard },
  { id: "TRANSFER", label: "Transferencia", icon: Smartphone },
]
const METHOD_LABELS: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia", ONLINE: "Online" }
const PAYMENT_STATUS: Record<string, string> = {
  PAID: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30",
  PENDING: "bg-amber-400/20 text-amber-300 border border-amber-400/40",
  REFUNDED: "bg-red-500/20 text-red-400 border border-red-400/30",
}

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"

// ─── Vista Sports ─────────────────────────────────────────────────────────────

function SportsPaymentsView({ businessId }: { businessId: string }) {
  const [bookings, setBookings] = useState<CourtBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [to, setTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [courtFilter, setCourtFilter] = useState("")

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ from: `${from}T00:00:00`, to: `${to}T23:59:59`, status: "COMPLETED" })
    const r = await fetch(`/api/businesses/${businessId}/court-bookings?${params}`)
    const d = await r.json()
    setBookings(d.bookings || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [from, to])

  const courts = Array.from(new Map(bookings.map(b => [b.court.id, b.court])).values())
  const filtered = courtFilter ? bookings.filter(b => b.court.id === courtFilter) : bookings
  const totalRevenue = filtered.reduce((s, b) => s + Number(b.price), 0)
  const byMethod = filtered.reduce((acc: Record<string, number>, b) => {
    const m = b.payment?.method || "CASH"
    acc[m] = (acc[m] || 0) + Number(b.price)
    return acc
  }, {})

  const inputStyle = { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)" }}>
            <TrendingUp className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide" style={{ color: NAVY }}>Pagos</h1>
            <p className="text-xs font-medium" style={{ color: "rgba(13,27,42,0.45)" }}>Historial de reservas cobradas</p>
          </div>
        </div>

        {/* Filtros fecha */}
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
          <span className="text-xs font-medium" style={{ color: "rgba(13,27,42,0.4)" }}>→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
          <button onClick={load} className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all"
            style={{ background: NAVY, color: GOLD }}>
            Filtrar
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl p-4 col-span-2 md:col-span-1" style={{ background: "#ffffff", border: "1px solid rgba(201,168,76,0.25)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.4)" }}>Total cobrado</p>
          <p className="text-2xl font-black" style={{ color: NAVY }}>${totalRevenue.toLocaleString("es-CL")}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.35)" }}>{filtered.length} reservas</p>
        </div>
        {Object.entries(byMethod).map(([method, amount]) => (
          <div key={method} className="rounded-2xl p-4" style={{ background: "#ffffff", border: "1px solid rgba(13,27,42,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.4)" }}>{METHOD_LABELS[method] || method}</p>
            <p className="text-lg font-black" style={{ color: NAVY }}>${(amount as number).toLocaleString("es-CL")}</p>
          </div>
        ))}
      </div>

      {/* Filtro cancha */}
      {courts.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCourtFilter("")}
            className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all"
            style={!courtFilter ? { background: "rgba(201,168,76,0.12)", border: `1px solid ${GOLD}`, color: "#8a6520" } : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.5)" }}>
            Todas las canchas
          </button>
          {courts.map(c => (
            <button key={c.id} onClick={() => setCourtFilter(c.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all"
              style={courtFilter === c.id ? { background: "rgba(201,168,76,0.12)", border: `1px solid ${GOLD}`, color: "#8a6520" } : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.5)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(13,27,42,0.08)", background: "#ffffff" }}>
        <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(13,27,42,0.06)", background: "rgba(13,27,42,0.02)" }}>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(13,27,42,0.4)" }}>
            Reservas cobradas — {filtered.length}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: "rgba(13,27,42,0.3)" }}>Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(13,27,42,0.15)" }} />
            <p className="text-sm font-semibold" style={{ color: "rgba(13,27,42,0.35)" }}>Sin reservas cobradas en este período</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(13,27,42,0.05)" }}>
            {filtered.map(b => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: b.court.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{b.client?.name || "Sin cliente"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>
                    {b.court.name}{b.court.sport ? ` · ${b.court.sport}` : ""} · {format(new Date(b.startTime), "d MMM", { locale: es })} {format(new Date(b.startTime), "HH:mm")}–{format(new Date(b.endTime), "HH:mm")}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black" style={{ color: NAVY }}>${Number(b.price).toLocaleString("es-CL")}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: "rgba(13,27,42,0.35)" }}>
                    {b.payment ? METHOD_LABELS[b.payment.method] || b.payment.method : "Efectivo"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Vista Servicios (POS original) ───────────────────────────────────────────

function ServicesPaymentsView({ businessId, hasBsale }: { businessId: string; hasBsale: boolean }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [method, setMethod] = useState("CASH")
  const [saving, setSaving] = useState(false)
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)
  const [emitting, setEmitting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const r = await fetch(`/api/businesses/${businessId}/appointments?${new URLSearchParams({ from: today.toISOString() })}`)
    const d = await r.json()
    setAppointments(d.appointments || [])
    setLoading(false)
  }

  async function registerPayment() {
    if (!selected) return
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: selected.id, method, amount: (selected.price ?? selected.service.price) }),
    })
    if (r.ok) {
      const data = await r.json()
      toast.success("Pago registrado")
      setLastPaymentId(data.payment?.id ?? null)
      load()
    } else toast.error("Error al registrar")
    setSaving(false)
  }

  async function emitBoleta() {
    if (!lastPaymentId || !selected) return
    setEmitting(true)
    const r = await fetch(`/api/businesses/${businessId}/invoices`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: lastPaymentId, clientName: selected.client.name }),
    })
    const data = await r.json()
    if (r.ok) {
      toast.success("Boleta emitida correctamente")
      if (data.invoice?.pdfUrl) window.open(data.invoice.pdfUrl, "_blank")
      setSelected(null); setLastPaymentId(null)
    } else toast.error(data.error || "Error al emitir boleta")
    setEmitting(false)
  }

  const todayRevenue = appointments.filter(a => a.payment?.status === "PAID").reduce((s, a) => s + Number(a.payment!.amount), 0)
  const pending = appointments.filter(a => !a.payment || a.payment.status !== "PAID").length
  const paid = appointments.filter(a => a.payment?.status === "PAID").length

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">Pagos</h1><p className="page-subtitle">Vista de caja del día</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: DollarSign, value: `$${todayRevenue.toLocaleString("es-AR")}`, label: "Recaudado hoy" },
          { icon: CheckCircle2, value: paid, label: "Pagados" },
          { icon: CreditCard, value: pending, label: "Pendientes de cobro" },
        ].map(({ icon: Icon, value, label }) => (
          <Card key={label}><CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-sky-400" />
            </div>
            <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Turnos de hoy</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 select-none">
              <p className="text-white/50 font-medium text-sm">Sin movimientos hoy</p>
            </div>
          ) : appointments.map((a, i) => (
            <div key={a.id} className={`flex items-center gap-4 px-4 py-3.5 ${i !== appointments.length - 1 ? "border-b" : ""}`}>
              <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: a.service.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.client.name}</p>
                <p className="text-sm text-muted-foreground">{a.service.name} • {format(new Date(a.startTime), "HH:mm")}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${Number(a.price ?? a.service.price).toLocaleString("es-AR")}</p>
                {a.payment ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS[a.payment.status] || ""}`}>
                    {a.payment.status === "PAID" ? METHOD_LABELS[a.payment.method] : "Pendiente"}
                  </span>
                ) : (
                  <Button size="sm" className="h-7 text-xs mt-1" onClick={() => { setSelected(a); setMethod("CASH") }}>Cobrar</Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                <p className="font-semibold">{selected.client.name}</p>
                <p className="text-sm text-muted-foreground">{selected.service.name}</p>
                <p className="text-2xl font-bold mt-2">${Number(selected.price ?? selected.service.price).toLocaleString("es-AR")}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Método de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map(m => (
                    <button key={m.id} onClick={() => setMethod(m.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors ${method === m.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}>
                      <m.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {!lastPaymentId ? (
                <Button className="w-full" onClick={registerPayment} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Registrando...</> : `Confirmar cobro · ${METHODS.find(m => m.id === method)?.label}`}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium justify-center py-1">
                    <CheckCircle2 className="w-4 h-4" /> Pago registrado
                  </div>
                  {hasBsale && (
                    <Button variant="outline" className="w-full gap-2" onClick={emitBoleta} disabled={emitting}>
                      {emitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      {emitting ? "Emitiendo..." : "Emitir boleta (Bsale)"}
                      {!emitting && <ExternalLink className="w-3 h-3 ml-auto opacity-50" />}
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setSelected(null); setLastPaymentId(null) }}>Cerrar</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { businessId, businessType, hasBsale } = useBusiness()
  if (!businessId) return null
  if (businessType === "SPORTS_CLUB") return <SportsPaymentsView businessId={businessId} />
  return <ServicesPaymentsView businessId={businessId} hasBsale={hasBsale} />
}
