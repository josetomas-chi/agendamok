"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { CreditCard, Banknote, Smartphone, DollarSign, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Appointment = {
  id: string; startTime: string; status: string
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
const PAYMENT_STATUS: Record<string, string> = { PAID: "bg-green-500/15 text-green-300", PENDING: "bg-yellow-500/15 text-yellow-300", REFUNDED: "bg-red-500/15 text-red-300" }

export default function PaymentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [method, setMethod] = useState("CASH")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(d => {
      setBusinessId(d.businessId)
      load(d.businessId)
    })
  }, [])

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
      body: JSON.stringify({ appointmentId: selected.id, method, amount: selected.service.price }),
    })
    if (r.ok) {
      toast.success("Pago registrado")
      setSelected(null)
      load(businessId)
    } else toast.error("Error al registrar")
    setSaving(false)
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
            <div className="text-center py-12 text-muted-foreground text-sm">No hay turnos para hoy</div>
          ) : (
            appointments.map((a, i) => (
              <div key={a.id} className={`flex items-center gap-4 px-4 py-3.5 ${i !== appointments.length - 1 ? "border-b" : ""}`}>
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: a.service.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{a.client.name}</p>
                  <p className="text-sm text-muted-foreground">{a.service.name} • {format(new Date(a.startTime), "HH:mm")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${Number(a.service.price).toLocaleString("es-AR")}</p>
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
                <p className="text-2xl font-bold mt-2">${Number(selected.service.price).toLocaleString("es-AR")}</p>
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
              <Button className="w-full" onClick={registerPayment} disabled={saving}>
                {saving ? "Registrando..." : `Confirmar cobro en ${METHODS.find(m => m.id === method)?.label}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
