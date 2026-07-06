import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function AdminSubscriptionsPage() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") redirect("/dashboard")

  const subs = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        include: { owner: { select: { name: true, email: true } } },
      },
    },
  })

  const planColor: Record<string, string> = {
    FREE: "bg-white/10 text-white/50 border border-white/10",
    PRO: "bg-sky-500/20 text-sky-400 border border-sky-400/30",
    ENTERPRISE: "bg-violet-500/20 text-violet-400 border border-violet-400/30",
  }
  const statusColor: Record<string, string> = {
    TRIALING: "bg-amber-400/15 text-amber-400 border border-amber-400/30",
    ACTIVE: "bg-emerald-500/15 text-emerald-400 border border-emerald-400/30",
    PAST_DUE: "bg-red-500/15 text-red-400 border border-red-400/30",
    CANCELED: "bg-white/10 text-white/40 border border-white/10",
    PAUSED: "bg-orange-500/15 text-orange-400 border border-orange-400/30",
  }
  const statusLabel: Record<string, string> = {
    TRIALING: "Periodo de prueba",
    ACTIVE: "Activa",
    PAST_DUE: "Vencida",
    CANCELED: "Cancelada",
    PAUSED: "Pausada",
  }

  type Sub = typeof subs[number]
  const totalMRR = subs
    .filter((s: Sub) => s.status === "ACTIVE")
    .reduce((acc: number, s: Sub) => acc + (s.plan === "FREE" ? 4990 : s.plan === "PRO" ? 9900 : 29900), 0)

  const active = subs.filter((s: Sub) => s.status === "ACTIVE").length
  const trialing = subs.filter((s: Sub) => s.status === "TRIALING").length

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suscripciones</h1>
          <p className="page-subtitle">{subs.length} suscripciones en total</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "MRR estimado", value: `$${totalMRR.toLocaleString("es-CL")}`, sub: "Ingresos mensuales activos", color: "bg-emerald-500/15 text-emerald-400", glow: "rgba(52,211,153,0.2)" },
          { label: "Suscripciones activas", value: active, sub: "Pagando en este momento", color: "bg-sky-500/15 text-sky-400", glow: "rgba(56,189,248,0.2)" },
          { label: "En periodo de prueba", value: trialing, sub: "Próximos a convertir", color: "bg-amber-400/15 text-amber-400", glow: "rgba(251,191,36,0.2)" },
        ].map(({ label, value, sub, color, glow }) => (
          <div key={label} className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "oklch(0.18 0.02 260)" }}>
            <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-2 text-white">{value}</p>
            <p className="text-xs text-white/30 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.07]">
            <tr>
              {["Negocio", "Plan", "Estado", "Fin de prueba", "Renovación", "Cancela"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-white/40 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-white/30">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No hay suscripciones
                </td>
              </tr>
            ) : subs.map((s: Sub, i: number) => (
              <tr key={s.id} className={`transition-colors hover:bg-white/[0.03] ${i !== subs.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-white/90">{s.business.name}</p>
                  <p className="text-xs text-white/40">{s.business.owner.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColor[s.plan]}`}>
                    {s.plan === "FREE" ? "Inicial" : s.plan}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[s.status]}`}>
                    {statusLabel[s.status] || s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/40">
                  {s.trialEndsAt ? new Date(s.trialEndsAt).toLocaleDateString("es-CL") : "—"}
                </td>
                <td className="px-4 py-3 text-white/40">
                  {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("es-CL") : "—"}
                </td>
                <td className="px-4 py-3">
                  {s.cancelAtPeriodEnd ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-400/30">Cancelando</span>
                  ) : <span className="text-white/30">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
