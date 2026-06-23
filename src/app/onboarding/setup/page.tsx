"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

  const inputCls = "w-full bg-[#3a3a3c] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/50 transition-colors text-sm"
  const labelCls = "block text-xs text-white/50 mb-1.5"
  const cardCls = "bg-[#2c2c30] border border-white/10 rounded-2xl p-6 space-y-5"

  return (
    <div className="min-h-screen bg-[#1c1c1e] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-8">

        {/* Logo */}
        <div className="text-center">
          <span className="font-bold text-2xl tracking-tight">Agenda<span className="text-sky-400">Mok</span></span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {stepConfig.map(({ label }, i) => {
            const s = i + 1
            const done = step > s
            const current = step === s
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  done ? "bg-sky-500 text-white" : current ? "bg-sky-500 text-white ring-4 ring-sky-500/20" : "bg-white/10 text-white/40"
                }`}>
                  {done ? <Check className="w-4 h-4" /> : s}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${current ? "text-sky-300" : done ? "text-white/60" : "text-white/25"}`}>{label}</span>
                {i < stepConfig.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded transition-all ${done ? "bg-sky-500" : "bg-white/10"}`} />
                )}
              </div>
            )
          })}
        </div>

        <p className="text-sm text-white/40 text-center">Paso {step} de {stepConfig.length} — {stepConfig[step - 1].label}</p>

        {/* Step 1: Servicios */}
        {step === 1 && (
          <div className={cardCls}>
            <div>
              <h2 className="text-xl font-semibold text-white">¿Qué servicios ofreces?</h2>
              <p className="text-sm text-white/40 mt-1">Agrega los servicios que tus clientes pueden reservar. Puedes agregar más desde el panel.</p>
            </div>
            <div className="space-y-3">
              {services.map((svc, i) => (
                <div key={i} className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => updateService(i, "color", c)}
                          className={`w-5 h-5 rounded-full transition-transform ${svc.color === c ? "scale-125 ring-2 ring-offset-2 ring-offset-[#2c2c30] ring-white/40" : ""}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                    {services.length > 1 && (
                      <button onClick={() => removeService(i)} className="text-white/30 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={labelCls}>Nombre del servicio *</label>
                      <input className={inputCls} value={svc.name} onChange={e => updateService(i, "name", e.target.value)} placeholder="Ej: Corte de pelo" />
                    </div>
                    <div>
                      <label className={labelCls}>Duración (min) *</label>
                      <input type="number" className={inputCls} value={svc.duration} onChange={e => updateService(i, "duration", e.target.value)} placeholder="60" min="5" />
                    </div>
                    <div>
                      <label className={labelCls}>Precio</label>
                      <input type="number" className={inputCls} value={svc.price} onChange={e => updateService(i, "price", e.target.value)} placeholder="0" min="0" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addService}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors text-sm">
                <Plus className="w-4 h-4" /> Agregar otro servicio
              </button>
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold disabled:opacity-40"
              onClick={handleSaveServices} disabled={saving}>
              {saving ? "Guardando..." : "Continuar"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Staff */}
        {step === 2 && (
          <div className={cardCls}>
            <div>
              <h2 className="text-xl font-semibold text-white">¿Quiénes son tus profesionales?</h2>
              <p className="text-sm text-white/40 mt-1">Agrega las personas que atienden en tu negocio. Si trabajas solo, completa con tu nombre.</p>
            </div>
            <div className="space-y-3">
              {staff.map((st, i) => (
                <div key={i} className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/60">Profesional {i + 1}</span>
                    {staff.length > 1 && (
                      <button onClick={() => removeStaff(i)} className="text-white/30 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Nombre *</label>
                      <input className={inputCls} value={st.name} onChange={e => updateStaff(i, "name", e.target.value)} placeholder="Ej: María García" />
                    </div>
                    <div>
                      <label className={labelCls}>Email (opcional)</label>
                      <input type="email" className={inputCls} value={st.email} onChange={e => updateStaff(i, "email", e.target.value)} placeholder="maria@negocio.com" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addStaff}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors text-sm">
                <Plus className="w-4 h-4" /> Agregar otro profesional
              </button>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors text-sm font-medium"
                onClick={() => setStep(1)}>Atrás</button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold disabled:opacity-40"
                onClick={handleSaveStaff} disabled={saving}>
                {saving ? "Guardando..." : "Continuar"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setStep(3 as Step)} className="w-full text-sm text-white/30 hover:text-white/60 transition-colors text-center">
              Omitir por ahora
            </button>
          </div>
        )}

        {/* Step 3: Método de pago */}
        {step === 3 && (
          <div className={cardCls}>
            <div>
              <h2 className="text-xl font-semibold text-white">Registra tu método de pago</h2>
              <p className="text-sm text-white/40 mt-1">Tienes 30 días gratis. Guarda tu tarjeta ahora para que el cobro sea automático cuando termine el periodo de prueba.</p>
            </div>
            <div className="bg-sky-500/10 border border-sky-400/20 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-sky-300">Plan Starter</span>
                <span className="text-xs bg-sky-500 text-white px-2 py-0.5 rounded-full font-semibold">30 días gratis</span>
              </div>
              <p className="text-xs text-white/40">A partir del día 31 se cobra $9.900/mes + IVA automáticamente. Puedes cancelar cuando quieras.</p>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-white/30 bg-white/[0.03] border border-white/5 rounded-xl p-3">
              <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Tus datos de tarjeta son procesados de forma segura por Flow.cl. AgendaMok nunca almacena los datos de tu tarjeta.
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold disabled:opacity-50"
              onClick={handleRegisterCard} disabled={registeringCard}>
              <CreditCard className="w-4 h-4" />
              {registeringCard ? "Redirigiendo a Flow..." : "Agregar tarjeta de crédito"}
            </button>
            <button onClick={() => setStep(4 as Step)} className="w-full text-sm text-white/30 hover:text-white/60 transition-colors text-center">
              Omitir por ahora — lo agrego desde Configuración
            </button>
          </div>
        )}

        {/* Step 4: Listo */}
        {step === 4 && (
          <div className={`${cardCls} text-center items-center`}>
            <div className="w-16 h-16 bg-sky-500/15 rounded-full flex items-center justify-center mx-auto"
              style={{ boxShadow: "0 0 24px rgba(14,165,233,0.3)" }}>
              <Rocket className="w-8 h-8 text-sky-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">¡Tu negocio está listo!</h2>
              <p className="text-white/40 mt-2 text-sm">Ya puedes recibir reservas. Desde el panel puedes seguir configurando horarios, precios y más.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full pt-2">
              <button onClick={() => router.push("/dashboard/settings?tab=booking")}
                className="py-3 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors text-sm font-medium">
                Ver mi página de reservas
              </button>
              <button onClick={() => router.push("/dashboard")}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold text-sm">
                Ir al panel <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
