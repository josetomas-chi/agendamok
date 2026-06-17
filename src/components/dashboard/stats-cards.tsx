import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Users, UserCheck, TrendingUp } from "lucide-react"

interface Props {
  totalAppointments: number
  totalClients: number
  totalStaff: number
  todayCount: number
}

export function StatsCards({ totalAppointments, totalClients, totalStaff, todayCount }: Props) {
  const stats = [
    { label: "Turnos hoy", value: todayCount, icon: Calendar },
    { label: "Turnos este mes", value: totalAppointments, icon: TrendingUp },
    { label: "Clientes", value: totalClients, icon: Users },
    { label: "Profesionales", value: totalStaff, icon: UserCheck },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: "0 0 16px rgba(56,189,248,0.25)" }}>
              <s.icon className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
