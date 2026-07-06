import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { TrendingUp, Users, Building2, Calendar, CreditCard } from "lucide-react"

export default async function AdminReportsPage() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") redirect("/dashboard")

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [
    totalBusinesses, newBusinessesThisMonth, newBusinessesLastMonth,
    totalUsers, totalAppointments, appointmentsThisMonth, appointmentsLastMonth,
    activeSubs, trialSubs, businessesByCategory, businessesByMonth,
  ] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.business.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
    prisma.business.count({ where: { deletedAt: null, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.appointment.count({ where: { deletedAt: null } }),
    prisma.appointment.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
    prisma.appointment.count({ where: { deletedAt: null, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.business.groupBy({ by: ["category"], where: { deletedAt: null }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 6 }),
    prisma.business.findMany({ where: { deletedAt: null }, select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
  ])

  const months: { label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" })
    const count = businessesByMonth.filter((b: { createdAt: Date }) => {
      const bd = new Date(b.createdAt)
      return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth()
    }).length
    months.push({ label, count })
  }
  const maxCount = Math.max(...months.map(m => m.count), 1)
  const mrr = activeSubs * 4990

  function delta(current: number, prev: number) {
    if (prev === 0) return current > 0 ? "+100%" : null
    const pct = Math.round(((current - prev) / prev) * 100)
    return pct >= 0 ? `+${pct}%` : `${pct}%`
  }

  const kpis = [
    { label: "Negocios totales", value: totalBusinesses, sub: `${newBusinessesThisMonth} este mes`, d: delta(newBusinessesThisMonth, newBusinessesLastMonth), icon: Building2, color: "bg-sky-500/15 text-sky-400", glow: "rgba(56,189,248,0.2)" },
    { label: "Usuarios totales", value: totalUsers, sub: "En toda la plataforma", d: null, icon: Users, color: "bg-violet-500/15 text-violet-400", glow: "rgba(167,139,250,0.2)" },
    { label: "Citas totales", value: totalAppointments, sub: `${appointmentsThisMonth} este mes`, d: delta(appointmentsThisMonth, appointmentsLastMonth), icon: Calendar, color: "bg-emerald-500/15 text-emerald-400", glow: "rgba(52,211,153,0.2)" },
    { label: "Suscripciones activas", value: activeSubs, sub: `${trialSubs} en prueba`, d: null, icon: CreditCard, color: "bg-amber-400/15 text-amber-400", glow: "rgba(251,191,36,0.2)" },
    { label: "MRR estimado", value: `$${mrr.toLocaleString("es-CL")}`, sub: "Ingresos mensuales recurrentes", d: null, icon: TrendingUp, color: "bg-rose-500/15 text-rose-400", glow: "rgba(251,113,133,0.2)" },
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Visión general de la plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map(({ label, value, sub, d, icon: Icon, color, glow }) => (
          <div key={label} className="rounded-2xl border border-white/[0.07] p-4 space-y-3" style={{ background: "oklch(0.18 0.02 260)" }}>
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`} style={{ boxShadow: `0 0 12px ${glow}` }}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-xs text-white/30">{sub}</p>
                {d && <span className={`text-xs font-semibold ${d.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>{d}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "oklch(0.18 0.02 260)" }}>
          <h2 className="font-semibold text-white mb-4">Nuevos negocios por mes</h2>
          <div className="flex items-end gap-2 h-32">
            {months.map(({ label, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-white/50">{count || ""}</span>
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max((count / maxCount) * 96, count > 0 ? 4 : 0)}px`,
                    background: count > 0 ? "linear-gradient(to top, #0ea5e9, #38bdf8)" : "rgba(255,255,255,0.05)",
                  }}
                />
                <span className="text-xs text-white/30">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "oklch(0.18 0.02 260)" }}>
          <h2 className="font-semibold text-white mb-4">Negocios por categoría</h2>
          <div className="space-y-3">
            {businessesByCategory.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">Sin datos</p>
            ) : businessesByCategory.map(({ category, _count }: { category: string; _count: { id: number } }) => {
              const pct = Math.round((_count.id / totalBusinesses) * 100)
              return (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-white/80">{category}</span>
                    <span className="text-white/40">{_count.id} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(to right, #0ea5e9, #38bdf8)" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "oklch(0.18 0.02 260)" }}>
        <h2 className="font-semibold text-white mb-4">Embudo de conversión</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Registrados", value: totalBusinesses, color: "bg-sky-500/15 text-sky-400 border border-sky-400/20" },
            { label: "En periodo de prueba", value: trialSubs, color: "bg-amber-400/15 text-amber-400 border border-amber-400/20" },
            { label: "Convertidos a pago", value: activeSubs, color: "bg-emerald-500/15 text-emerald-400 border border-emerald-400/20" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl p-5 ${color}`}>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm font-medium mt-1 opacity-80">{label}</p>
              {totalBusinesses > 0 && (
                <p className="text-xs opacity-50 mt-0.5">{Math.round((value / totalBusinesses) * 100)}% del total</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
