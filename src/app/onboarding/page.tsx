"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, CreditCard, Lock, ArrowRight } from "lucide-react"

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

  const [form, setForm] = useState({ businessName: "", category: "", slug: "" })

  function generateSlug(name: string) {
    return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
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
        body: JSON.stringify({ ...form, plan: "STARTER" }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Error")
      }
      setStep(3)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear el negocio")
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
    <div className="min-h-screen bg-[#1c1c1e] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-8">

        {/* Logo */}
        <div className="text-center">
          <span className="font-bold text-2xl tracking-tight">Agenda<span className="text-sky-400">Mok</span></span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {steps.map((label, i) => {
            const s = (i + 1) as Step
            const done = step > s
            const current = step === s
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  done ? "bg-sky-500 text-white" : current ? "bg-sky-500 text-white ring-4 ring-sky-500/20" : "bg-white/10 text-white/40"
                }`}>
                  {done ? <Check className="w-4 h-4" /> : s}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded transition-all ${done ? "bg-sky-500" : "bg-white/10"}`} />
                )}
              </div>
            )
          })}
        </div>
        <p className="text-sm text-white/40 text-center">Paso {step} de {steps.length} — {steps[step - 1]}</p>

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-[#2c2c30] border border-white/10 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Cuéntanos sobre tu negocio</h2>
              <p className="text-sm text-white/40 mt-1">Estos datos aparecerán en tu página de reservas pública.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/60">Nombre del negocio</label>
              <input
                className="w-full bg-[#3a3a3c] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/50 transition-colors"
                placeholder="Ej: Peluquería San Martín"
                value={form.businessName}
                onChange={handleNameChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/60">URL de tu página de reservas</label>
              <div className="flex items-center gap-2 bg-[#3a3a3c] border border-white/10 rounded-xl px-4 py-3">
                <span className="text-white/30 text-sm whitespace-nowrap">agendamok.cl/book/</span>
                <input
                  className="flex-1 bg-transparent text-white placeholder-white/30 focus:outline-none text-sm"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="mi-negocio"
                />
              </div>
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!form.businessName || !form.slug}
              onClick={() => setStep(2)}
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-[#2c2c30] border border-white/10 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-white">¿Qué tipo de negocio es?</h2>
              <p className="text-sm text-white/40 mt-1">Usamos esto para personalizar tu experiencia.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`p-3 rounded-xl border text-sm text-left transition-all ${
                    form.category === cat
                      ? "border-sky-400/60 bg-sky-500/10 text-sky-300"
                      : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {form.category === cat && <Check className="w-3 h-3 inline mr-1.5 text-sky-400" />}
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors text-sm font-medium"
                onClick={() => setStep(1)}
              >
                Atrás
              </button>
              <button
                className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={!form.category || loading}
                onClick={handleFinish}
              >
                {loading ? "Creando..." : <><span>Continuar</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="bg-[#2c2c30] border border-white/10 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Registra tu método de pago</h2>
              <p className="text-sm text-white/40 mt-1">Tienes 3 meses gratis. Guardá tu tarjeta ahora para que el cobro sea automático al vencer el periodo de prueba.</p>
            </div>

            <div className="bg-sky-500/10 border border-sky-400/20 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-sky-300">Plan Starter</span>
                <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full font-semibold">3 meses gratis</span>
              </div>
              <p className="text-xs text-white/40">A partir del día 91 se cobra $9.900/mes + IVA automáticamente. Podés cancelar cuando quieras.</p>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-white/30 bg-white/[0.03] border border-white/5 rounded-xl p-3">
              <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Tus datos de tarjeta son procesados de forma segura por Flow.cl. AgendaMok nunca almacena los datos de tu tarjeta.
            </div>

            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold text-white disabled:opacity-50"
              onClick={handleRegisterCard}
              disabled={registeringCard}
            >
              <CreditCard className="w-4 h-4" />
              {registeringCard ? "Redirigiendo a Flow..." : "Agregar tarjeta de crédito"}
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full text-sm text-white/30 hover:text-white/60 transition-colors text-center"
            >
              Omitir por ahora — lo agrego desde Configuración
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
