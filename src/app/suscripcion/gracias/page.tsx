"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, ArrowRight, LayoutDashboard, Loader2, XCircle } from "lucide-react"
import Link from "next/link"

const PLAN_LABELS: Record<string, { name: string; price: string; features: string[] }> = {
  STARTER: {
    name: "Plan Starter",
    price: "$9.900/mes",
    features: ["Agenda online", "Hasta 2 profesionales", "Recordatorios automáticos"],
  },
  NEGOCIO: {
    name: "Plan Negocio",
    price: "$24.900/mes",
    features: ["Todo Starter", "Staff ilimitado", "Reportes avanzados", "Campañas de marketing"],
  },
  PRO: {
    name: "Plan Pro",
    price: "$39.900/mes",
    features: ["Todo Negocio", "API acceso", "Bot IA de atención", "Soporte prioritario"],
  },
  SPORTS: {
    name: "AgendaMok Sports",
    price: "$39.900/mes",
    features: ["Gestión de canchas", "Reservas online", "Pagos integrados", "Multi-deporte"],
  },
}

export default function SuscripcionGraciasPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [plan, setPlan] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const token = params.get("token")
    if (!token) { setStatus("error"); return }

    // Flow sends the token back; we check the subscription status from our DB
    fetch("/api/flow/verify-card?token=" + token)
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setPlan(d.plan || null)
          setEmail(d.email || null)
          setStatus("success")
        } else {
          setStatus("error")
        }
      })
      .catch(() => setStatus("error"))
  }, [params])

  const planInfo = plan ? PLAN_LABELS[plan] : null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <header className="flex items-center justify-center py-6 px-4">
        <Link href="/" className="flex items-center gap-1.5">
          <img src="/agendamok-icon.png" alt="AgendaMok" className="w-8 h-8" />
          <span className="text-lg font-black text-gray-900">Agenda</span>
          <span className="text-lg font-black text-sky-400">Mok</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
            <p className="text-gray-500 text-sm">Verificando tu suscripción...</p>
          </div>
        )}

        {status === "error" && (
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Algo salió mal</h1>
              <p className="text-gray-500 mt-2 text-sm">No pudimos verificar tu pago. Si el cargo ya fue realizado, tu plan se activará en unos minutos.</p>
            </div>
            <Link href="/dashboard/settings?tab=billing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#0d1b2a" }}>
              Ver mi plan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === "success" && (
          <div className="max-w-lg w-full space-y-6">
            {/* Success card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
              {/* Icon */}
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "linear-gradient(135deg, #e0f2fe, #bae6fd)" }}>
                <CheckCircle2 className="w-10 h-10 text-sky-500" />
              </div>

              <div>
                <h1 className="text-3xl font-black text-gray-900">¡Bienvenido a AgendaMok!</h1>
                {planInfo && (
                  <p className="text-sky-500 font-semibold mt-1">{planInfo.name} activado</p>
                )}
                {email && (
                  <p className="text-gray-400 text-sm mt-2">Enviamos los detalles a <span className="font-medium text-gray-600">{email}</span></p>
                )}
              </div>

              {/* Plan details */}
              {planInfo && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-left space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{planInfo.name}</span>
                    <span className="text-sky-500 font-bold text-sm">{planInfo.price}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {planInfo.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-4 h-4 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-sky-500" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <Link href="/dashboard"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-sm transition-opacity hover:opacity-90 mt-2"
                style={{ background: "#0d1b2a" }}>
                <LayoutDashboard className="w-4 h-4" />
                Ir a mi dashboard
              </Link>
            </div>

            {/* Help note */}
            <p className="text-center text-xs text-gray-400">
              ¿Tienes dudas? Escríbenos a{" "}
              <a href="mailto:hola@agendamok.cl" className="text-sky-500 hover:underline">hola@agendamok.cl</a>
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-gray-300">© 2026 AgendaMok · Todos los derechos reservados</p>
      </footer>
    </div>
  )
}
