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
    totalBusinesses,
    newBusinessesThisMonth,
    newBusinessesLastMonth,
    totalUsers,
    totalAppointments,
    appointmentsThisMonth,
    appointmentsLastMonth,
    activeSubs,
    trialSubs,
    businessesByCategory,
    businessesByMonth,
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
    prisma.business.findMany({
      where: { deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // Group businesses by month (last 6 months)
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

  const mrr = (activeSubs * 4990) // estimate with base plan

  function delta(current: number, prev: number) {
    if (prev === 0) return current > 0 ? "+100%" : "—"
    const pct = Math.round(((current - prev) / prev) * 100)
    return pct >= 0 ? `+${pct}%` : `${pct}%`
  }

  const kpis = [
    { label: "Negocios totales", value: totalBusinesses, sub: `${newBusinessesThisMonth} este mes`, delta: delta(newBusinessesThisMonth, newBusinessesLastMonth), icon: Building2, color: "text-indigo-600 bg-indigo-50" },
    { label: "Usuarios totales", value: totalUsers, sub: "En toda la plataforma", icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Citas totales", value: totalAppointments, sub: `${appointmentsThisMonth} este mes`, delta: delta(appointmentsThisMonth, appointmentsLastMonth), icon: Calendar, color: "text-green-600 bg-green-50" },
    { label: "Suscripciones activas", value: activeSubs, sub: `${trialSubs} en prueba`, icon: CreditCard, color: "text-purple-600 bg-purple-50" },
    { label: "MRR estimado", value: `$${mrr.toLocaleString("es-CL")}`, sub: "Ingresos mensuales recurrentes", icon: TrendingUp, color: "text-orange-600 bg-orange-50" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground text-sm mt-1">Vision general de la plataforma</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map(({ label, value, sub, delta: d, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border p-4 space-y-3">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-xs text-muted-foreground">{sub}</p>
                {d && <span className={`text-xs font-semibold ${d.startsWith("+") ? "text-green-600" : "text-red-500"}`}>{d}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Negocios por mes */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-4">Nuevos negocios por mes</h2>
          <div className="flex items-end gap-2 h-32">
            {months.map(({ label, count }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground">{count || ""}</span>
                <div
                  className="w-full bg-indigo-500 rounded-t-sm transition-all"
                  style={{ height: `${Math.max((count / maxCount) * 96, count > 0 ? 4 : 0)}px` }}
                />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Negocios por categoria */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold mb-4">Negocios por categoria</h2>
          <div className="space-y-3">
            {businessesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
            ) : businessesByCategory.map(({ category, _count }: { category: string; _count: { id: number } }) => {
              const pct = Math.round((_count.id / totalBusinesses) * 100)
              return (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{category}</span>
                    <span className="text-muted-foreground">{_count.id} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold mb-4">Embudo de conversion</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Registrados", value: totalBusinesses, color: "bg-indigo-100 text-indigo-700" },
            { label: "En periodo de prueba", value: trialSubs, color: "bg-yellow-100 text-yellow-700" },
            { label: "Convertidos a pago", value: activeSubs, color: "bg-green-100 text-green-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl p-4 ${color}`}>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm font-medium mt-1">{label}</p>
              {totalBusinesses > 0 && (
                <p className="text-xs opacity-70 mt-0.5">{Math.round((value / totalBusinesses) * 100)}% del total</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
