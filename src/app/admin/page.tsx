import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, Calendar, TrendingUp } from "lucide-react"

export default async function AdminDashboard() {
  const [totalBusinesses, totalUsers, totalAppointments, activeSubscriptions] = await Promise.all([
    prisma.business.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.appointment.count({ where: { deletedAt: null } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
  ])

  const recentBusinesses = await prisma.business.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { owner: { select: { name: true, email: true } } },
  })

  const kpis = [
    { label: "Negocios registrados", value: totalBusinesses, icon: Building2, color: "bg-sky-500/15 text-sky-400", glow: "rgba(56,189,248,0.25)" },
    { label: "Usuarios totales", value: totalUsers, icon: Users, color: "bg-violet-500/15 text-violet-400", glow: "rgba(167,139,250,0.25)" },
    { label: "Citas registradas", value: totalAppointments, icon: Calendar, color: "bg-emerald-500/15 text-emerald-400", glow: "rgba(52,211,153,0.25)" },
    { label: "Suscripciones activas", value: activeSubscriptions, icon: TrendingUp, color: "bg-amber-500/15 text-amber-400", glow: "rgba(251,191,36,0.25)" },
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de Administración</h1>
          <p className="page-subtitle">Vista global de la plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${k.color}`}
                style={{ boxShadow: `0 0 16px ${k.glow}` }}>
                <k.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-sm text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Negocios recientes</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recentBusinesses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay negocios registrados aún</p>
          ) : recentBusinesses.map((b: typeof recentBusinesses[number], i: number) => (
            <div key={b.id} className={`flex items-center justify-between px-6 py-3.5 ${i !== recentBusinesses.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400 font-bold text-sm">
                  {b.name[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{b.name}</p>
                  <p className="text-xs text-white/40">{b.owner.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40">{b.category}</p>
                <p className="text-xs text-white/30">{new Date(b.createdAt).toLocaleDateString("es-CL")}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
