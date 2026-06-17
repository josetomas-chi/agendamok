"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Check, Plus, Trash2, ArrowRight, Scissors, Users, Rocket, CreditCard, Lock } from "lucide-react"

type Step = 1 | 2 | 3 | 4

type ServiceDraft = { name: string; duration: string; price: string; color: string }
type StaffDraft = { name: string; email: string }

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"]

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [registeringCard, setRegisteringCard] = useState(false)

  const [services, setServices] = useState<ServiceDraft[]>([
    { name: "", duration: "60", price: "", color: "#6366f1" },
  ])
  const [staff, setStaff] = useState<StaffDraft[]>([
    { name: "", email: "" },
  ])

  function addService() {
    setServices(s => [...s, { name: "", duration: "60", price: "", color: COLORS[s.length % COLORS.length] }])
  }
  function removeService(i: number) {
    setServices(s => s.filter((_, idx) => idx !== i))
  }
  function updateService(i: number, field: keyof ServiceDraft, val: string) {
    setServices(s => s.map((svc, idx) => idx === i ? { ...svc, [field]: val } : svc))
  }

  function addStaff() {
    setStaff(s => [...s, { name: "", email: "" }])
  }
  function removeStaff(i: number) {
    setStaff(s => s.filter((_, idx) => idx !== i))
  }
  function updateStaff(i: number, field: keyof StaffDraft, val: string) {
    setStaff(s => s.map((st, idx) => idx === i ? { ...st, [field]: val } : st))
  }

  async function handleSaveServices() {
    const valid = services.filter(s => s.name.trim() && s.duration)
    if (valid.length === 0) {
      toast.error("Agrega al menos un servicio")
      return
    }
    setSaving(true)
    try {
      const bizRes = await fetch("/api/me/business")
      const { businessId } = await bizRes.json()
      await Promise.all(valid.map(svc =>
        fetch(`/api/businesses/${businessId}/services`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: svc.name.trim(),
            duration: Number(svc.duration),
            price: Number(svc.price) || 0,
            color: svc.color,
          }),
        })
      ))
      setStep(2)
    } catch {
      toast.error("Error al guardar servicios")
    }
    setSaving(false)
  }

  async function handleSaveStaff() {
    const valid = staff.filter(s => s.name.trim())
    setSaving(true)
    try {
      if (valid.length > 0) {
        const bizRes = await fetch("/api/me/business")
        const { businessId } = await bizRes.json()
        await Promise.all(valid.map(st =>
          fetch(`/api/businesses/${businessId}/staff`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: st.name.trim(), email: st.email.trim() || undefined }),
          })
        ))
      }
      setStep(3 as Step)
    } catch {
      toast.error("Error al guardar profesionales")
    }
    setSaving(false)
  }

  async function handleRegisterCard() {
    setRegisteringCard(true)
    try {
      const r = await fetch("/api/flow/register-card", { method: "POST" })
      const d = await r.json()
      if (d.url) {
        window.location.href = d.url
      } else {
        toast.error(d.error || "Error al conectar con el procesador de pagos")
        setRegisteringCard(false)
      }
    } catch {
      toast.error("Error al conectar con el procesador de pagos")
      setRegisteringCard(false)
    }
  }

  const stepConfig = [
    { icon: Scissors, label: "Servicios" },
    { icon: Users, label: "Profesionales" },
    { icon: CreditCard, label: "Pago" },
    { icon: Rocket, label: "Listo" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">

        {/* Progress */}
        <div className="flex items-center gap-2">
          {stepConfig.map(({ label }, i) => {
            const s = i + 1
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step > s ? "bg-indigo-600 text-white" : step === s ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${step === s ? "text-indigo-600" : "text-muted-foreground"}`}>{label}</span>
                {s < 3 && <div className={`flex-1 h-1 rounded ${step > s ? "bg-indigo-600" : "bg-gray-200"}`} />}
              </div>
            )
          })}
        </div>

        {/* Step 1: Servicios */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>¿Qué servicios ofreces?</CardTitle>
              <CardDescription>Agrega los servicios que tus clientes pueden reservar. Puedes agregar más desde el panel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((svc, i) => (
                <div key={i} className="p-4 border rounded-xl space-y-3 relative">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => updateService(i, "color", c)}
                          className={`w-5 h-5 rounded-full transition-transform ${svc.color === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                    {services.length > 1 && (
                      <button onClick={() => removeService(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label>Nombre del servicio *</Label>
                      <Input value={svc.name} onChange={e => updateService(i, "name", e.target.value)} placeholder="Ej: Corte de pelo" />
                    </div>
                    <div className="space-y-1">
                      <Label>Duración (min) *</Label>
                      <Input type="number" value={svc.duration} onChange={e => updateService(i, "duration", e.target.value)} placeholder="60" min="5" />
                    </div>
                    <div className="space-y-1">
                      <Label>Precio</Label>
                      <Input type="number" value={svc.price} onChange={e => updateService(i, "price", e.target.value)} placeholder="0" min="0" />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full gap-2" onClick={addService}>
                <Plus className="w-4 h-4" /> Agregar otro servicio
              </Button>
              <Button className="w-full gap-2" onClick={handleSaveServices} disabled={saving}>
                {saving ? "Guardando..." : "Continuar"} <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Staff */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>¿Quiénes son tus profesionales?</CardTitle>
              <CardDescription>Agrega las personas que atienden en tu negocio. Si trabajas solo, completa con tu nombre.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staff.map((st, i) => (
                <div key={i} className="p-4 border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Profesional {i + 1}</span>
                    {staff.length > 1 && (
                      <button onClick={() => removeStaff(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Nombre *</Label>
                      <Input value={st.name} onChange={e => updateStaff(i, "name", e.target.value)} placeholder="Ej: María García" />
                    </div>
                    <div className="space-y-1">
                      <Label>Email (opcional)</Label>
                      <Input type="email" value={st.email} onChange={e => updateStaff(i, "email", e.target.value)} placeholder="maria@negocio.com" />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full gap-2" onClick={addStaff}>
                <Plus className="w-4 h-4" /> Agregar otro profesional
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Atrás</Button>
                <Button className="flex-1 gap-2" onClick={handleSaveStaff} disabled={saving}>
                  {saving ? "Guardando..." : "Continuar"} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <button onClick={() => setStep(3 as Step)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center pt-1">
                Omitir por ahora
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Método de pago */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Registra tu método de pago</CardTitle>
              <CardDescription>
                Tienes 3 meses gratis. Guarda tu tarjeta ahora para que el cobro sea automático cuando termine el periodo de prueba.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-indigo-800">Plan Inicial</span>
                  <Badge className="bg-indigo-600">3 meses gratis</Badge>
                </div>
                <p className="text-xs text-indigo-700">A partir del día 91 se cobra $4.990/mes automáticamente. Puedes cancelar cuando quieras.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-gray-50 rounded-lg">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                Tus datos de tarjeta son procesados de forma segura por Flow.cl. AgendaMok nunca almacena los datos de tu tarjeta.
              </div>
              <Button className="w-full gap-2 h-11" onClick={handleRegisterCard} disabled={registeringCard}>
                <CreditCard className="w-4 h-4" />
                {registeringCard ? "Redirigiendo a Flow..." : "Agregar tarjeta de crédito"}
              </Button>
              <button onClick={() => setStep(4 as Step)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center pt-1">
                Omitir por ahora — lo agrego desde Configuración
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Listo */}
        {step === 4 && (
          <Card className="text-center">
            <CardContent className="pt-8 pb-8 space-y-5">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Rocket className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">¡Tu negocio está listo!</h2>
                <p className="text-muted-foreground mt-2">Ya puedes recibir reservas. Desde el panel puedes seguir configurando horarios, precios y más.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" onClick={() => router.push("/dashboard/settings?tab=booking")} className="gap-2">
                  Ver mi página de reservas
                </Button>
                <Button onClick={() => router.push("/dashboard")} className="gap-2">
                  Ir al panel <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
