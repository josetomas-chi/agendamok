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
    { label: "Turnos hoy", value: todayCount, icon: Calendar, color: "text-indigo-600 bg-indigo-50" },
    { label: "Turnos este mes", value: totalAppointments, icon: TrendingUp, color: "text-green-600 bg-green-50" },
    { label: "Clientes", value: totalClients, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Profesionales", value: totalStaff, icon: UserCheck, color: "text-purple-600 bg-purple-50" },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="w-5 h-5" />
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
