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
    { label: "Negocios registrados", value: totalBusinesses, icon: Building2, color: "text-blue-600 bg-blue-50" },
    { label: "Usuarios totales", value: totalUsers, icon: Users, color: "text-purple-600 bg-purple-50" },
    { label: "Citas registradas", value: totalAppointments, icon: Calendar, color: "text-green-600 bg-green-50" },
    { label: "Suscripciones activas", value: activeSubscriptions, icon: TrendingUp, color: "text-orange-600 bg-orange-50" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Administracion</h1>
        <p className="text-muted-foreground text-sm mt-1">Vista global de la plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${k.color}`}>
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
        <CardContent>
          <div className="space-y-0">
            {recentBusinesses.map((b: typeof recentBusinesses[number], i: number) => (
              <div key={b.id} className={`flex items-center justify-between py-3 ${i !== recentBusinesses.length - 1 ? "border-b" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {b.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.owner.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{b.category}</p>
                  <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("es-CL")}</p>
                </div>
              </div>
            ))}
            {recentBusinesses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No hay negocios registrados aun</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
