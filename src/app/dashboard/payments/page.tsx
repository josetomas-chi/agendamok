"use client"

import { useState, useEffect } from "react"
import { useBusiness } from "@/contexts/business-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { CreditCard, Banknote, Smartphone, DollarSign, CheckCircle2, FileText, ExternalLink, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Appointment = {
  id: string; startTime: string; status: string; price?: number | null
  service: { name: string; price: number; color: string }
  staff: { user: { name: string | null } }
  client: { name: string }
  payment: { amount: number; status: string; method: string } | null
}

const METHODS = [
  { id: "CASH", label: "Efectivo", icon: Banknote },
  { id: "CARD", label: "Tarjeta", icon: CreditCard },
  { id: "TRANSFER", label: "Transferencia", icon: Smartphone },
]

const METHOD_LABELS: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia", ONLINE: "Online" }
const PAYMENT_STATUS: Record<string, string> = {
  PAID: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30",
  PENDING: "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.15)]",
  REFUNDED: "bg-red-500/20 text-red-400 border border-red-400/30",
}

export default function PaymentsPage() {
  const { businessId, hasBsale } = useBusiness()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [method, setMethod] = useState("CASH")
  const [saving, setSaving] = useState(false)
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)
  const [emitting, setEmitting] = useState(false)

  useEffect(() => {
    if (!businessId) return
    load(businessId)
  }, [businessId])

  async function load(bid: string) {
    setLoading(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const params = new URLSearchParams({ from: today.toISOString() })
    const r = await fetch(`/api/businesses/${bid}/appointments?${params}`)
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
      load(businessId)
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
      setSelected(null)
      setLastPaymentId(null)
    } else {
      toast.error(data.error || "Error al emitir boleta")
    }
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

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: DollarSign, value: `$${todayRevenue.toLocaleString("es-AR")}`, label: "Recaudado hoy" },
          { icon: CheckCircle2, value: paid, label: "Pagados" },
          { icon: CreditCard, value: pending, label: "Pendientes de cobro" },
        ].map(({ icon: Icon, value, label }) => (
          <Card key={label}><CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: "0 0 16px rgba(56,189,248,0.25)" }}>
              <Icon className="w-5 h-5 text-sky-400" />
            </div>
            <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Appointment list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Turnos de hoy</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 select-none">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-3 opacity-20">
                <rect x="6" y="10" width="36" height="32" rx="5" stroke="white" strokeWidth="2"/>
                <path d="M6 18h36" stroke="white" strokeWidth="2"/>
                <circle cx="24" cy="30" r="6" stroke="white" strokeWidth="2"/>
                <path d="M24 27v3l2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-white/50 font-medium text-sm">Sin movimientos hoy</p>
              <p className="text-white/25 text-xs mt-1">Los cobros del día aparecerán aquí</p>
            </div>
          ) : (
            appointments.map((a, i) => (
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
                    <Button size="sm" className="h-7 text-xs mt-1" onClick={() => { setSelected(a); setMethod("CASH") }}>
                      Cobrar
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Payment modal */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                <p className="font-semibold">{selected.client.name}</p>
                <p className="text-sm text-muted-foreground">{selected.service.name}</p>
                <p className="text-2xl font-bold mt-2">${Number((selected.price ?? selected.service.price)).toLocaleString("es-AR")}</p>
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
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setSelected(null); setLastPaymentId(null) }}>
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
