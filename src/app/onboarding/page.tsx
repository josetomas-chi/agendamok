"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Check, CreditCard, Lock } from "lucide-react"

const CATEGORIES = [
  "Belleza y estética", "Salud y medicina", "Fitness y deporte",
  "Legal y contable", "Educación y clases", "Veterinaria",
  "Odontología", "Psicología", "Nutrición", "Otro",
]

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [registeringCard, setRegisteringCard] = useState(false)

  const [form, setForm] = useState({
    businessName: "",
    category: "",
    slug: "",
  })

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setForm(f => ({ ...f, businessName: name, slug: generateSlug(name) }))
  }

  async function handleFinish() {
    setLoading(true)
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan: "FREE" }),
      })
      if (!res.ok) throw new Error()
      setStep(3)
    } catch {
      toast.error("Error al crear el negocio")
    }
    setLoading(false)
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

  const steps = ["Tu negocio", "Categoría", "Método de pago"]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">

        {/* Progress */}
        <div className="flex items-center gap-2">
          {steps.map((label, i) => {
            const s = (i + 1) as Step
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step > s ? "bg-indigo-600 text-white" : step === s ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-1 rounded ${step > s ? "bg-indigo-600" : "bg-gray-200"}`} />}
              </div>
            )
          })}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Paso {step} de {steps.length} — {steps[step - 1]}
        </p>

        {/* Step 1: Datos del negocio */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Cuéntanos sobre tu negocio</CardTitle>
              <CardDescription>Estos datos aparecerán en tu página de reservas pública.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del negocio</Label>
                <Input placeholder="Ej: Studio Belleza Mariana" value={form.businessName} onChange={handleNameChange} />
              </div>
              <div className="space-y-2">
                <Label>Dirección web de tu página de reservas</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">agendapro.com/book/</span>
                  <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="mi-negocio" />
                </div>
              </div>
              <Button className="w-full" disabled={!form.businessName || !form.slug} onClick={() => setStep(2)}>
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Categoría */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>¿Qué tipo de negocio es?</CardTitle>
              <CardDescription>Usamos esto para personalizar tu experiencia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                      form.category === cat ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    {form.category === cat && <Check className="w-3 h-3 inline mr-1" />}
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Atrás</Button>
                <Button className="flex-1" disabled={!form.category} onClick={handleFinish}>
                  {loading ? "Creando negocio..." : "Continuar"}
                </Button>
              </div>
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

              <button
                onClick={() => router.push("/dashboard")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center pt-1"
              >
                Omitir por ahora — lo agrego desde Configuración
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
