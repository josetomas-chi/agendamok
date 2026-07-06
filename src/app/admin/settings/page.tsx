import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Mail, CreditCard, Globe } from "lucide-react"

export default async function AdminSettingsPage() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") redirect("/dashboard")

  const flowUrl = process.env.FLOW_API_URL || ""
  const flowIsProduction = flowUrl.includes("www.flow.cl")
  const resendConfigured = !!process.env.RESEND_API_KEY

  const items = [
    {
      icon: Mail,
      title: "Email (Resend)",
      detail: "Las confirmaciones de turnos y los links de invitación se envían automáticamente.",
      status: resendConfigured ? "active" : "inactive",
    },
    {
      icon: CreditCard,
      title: "Pagos (Flow)",
      detail: flowIsProduction
        ? "Flow operando en modo producción. Los pagos son reales."
        : "Flow en modo sandbox. Los pagos son de prueba. Cambia FLOW_API_URL a https://www.flow.cl/api para producción.",
      status: flowIsProduction ? "active" : "sandbox",
    },
    {
      icon: Globe,
      title: "Widget embebible",
      detail: "El script /widget.js está disponible públicamente para que los clientes lo integren en sus webs.",
      status: "active",
    },
  ]

  const statusStyle: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400 border border-emerald-400/30",
    sandbox: "bg-amber-400/15 text-amber-400 border border-amber-400/30",
    inactive: "bg-red-500/15 text-red-400 border border-red-400/30",
  }
  const statusLabel: Record<string, string> = { active: "Activo", sandbox: "Sandbox", inactive: "Inactivo" }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Estado de las integraciones y servicios globales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.map(({ icon: Icon, title, detail, status }) => (
          <div key={title} className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "oklch(0.18 0.02 260)" }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-white">{title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[status]}`}>
                    {statusLabel[status]}
                  </span>
                </div>
                <p className="text-sm text-white/40">{detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "oklch(0.18 0.02 260)" }}>
        <p className="font-semibold text-white mb-1">Variables de entorno</p>
        <p className="text-sm text-white/40 mb-4">Configura estas variables en Vercel → Settings → Environment Variables.</p>
        <div className="space-y-2 font-mono text-xs">
          {[
            { key: "NEXTAUTH_URL", hint: "URL base de la app" },
            { key: "DATABASE_URL", hint: "Conexión a PostgreSQL" },
            { key: "RESEND_API_KEY", hint: "API key de Resend para emails" },
            { key: "RESEND_FROM_EMAIL", hint: "Dirección FROM de los emails" },
            { key: "FLOW_API_KEY", hint: "API key de Flow.cl" },
            { key: "FLOW_API_URL", hint: "sandbox.flow.cl en dev / www.flow.cl en producción" },
          ].map(({ key, hint }) => (
            <div key={key} className="flex items-center gap-3 p-2.5 bg-white/[0.04] rounded-lg border border-white/[0.05]">
              <span className="text-sky-400 font-semibold w-52 flex-shrink-0">{key}</span>
              <span className="text-white/30">{hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
