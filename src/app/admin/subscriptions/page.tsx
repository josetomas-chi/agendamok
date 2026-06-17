import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { CreditCard } from "lucide-react"

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
    FREE: "bg-gray-100 text-gray-700",
    PRO: "bg-blue-100 text-blue-700",
    ENTERPRISE: "bg-purple-100 text-purple-700",
  }
  const statusColor: Record<string, string> = {
    TRIALING: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-green-100 text-green-700",
    PAST_DUE: "bg-red-100 text-red-700",
    CANCELED: "bg-gray-100 text-gray-500",
    PAUSED: "bg-orange-100 text-orange-700",
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
      <div>
        <h1 className="text-2xl font-bold">Suscripciones</h1>
        <p className="text-muted-foreground text-sm mt-1">{subs.length} suscripciones en total</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "MRR estimado", value: `$${totalMRR.toLocaleString("es-CL")}`, sub: "Ingresos mensuales activos" },
          { label: "Suscripciones activas", value: active, sub: "Pagando en este momento" },
          { label: "En periodo de prueba", value: trialing, sub: "Proximos a convertir" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Negocio</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fin de prueba</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Renovacion</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cancela</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No hay suscripciones
                </td>
              </tr>
            ) : subs.map((s: Sub) => (
              <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{s.business.name}</p>
                  <p className="text-xs text-muted-foreground">{s.business.owner.email}</p>
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
                <td className="px-4 py-3 text-muted-foreground">
                  {s.trialEndsAt ? new Date(s.trialEndsAt).toLocaleDateString("es-CL") : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("es-CL") : "—"}
                </td>
                <td className="px-4 py-3">
                  {s.cancelAtPeriodEnd ? (
                    <Badge variant="destructive" className="text-xs">Cancelando</Badge>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
