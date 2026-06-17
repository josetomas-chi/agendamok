"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { TrendingUp, Users, CheckCircle, XCircle, AlertCircle } from "lucide-react"

type Stats = {
  revenueByMonth: { month: string; revenue: number }[]
  monthStats: { total: number; completed: number; cancelled: number; noShow: number; revenue: number; occupancyRate: number; noShowRate: number }
  topServices: { name: string; count: number }[]
  topClients: { name: string; visits: number }[]
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

export default function ReportsPage() {
  const [data, setData] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(async d => {
      const r = await fetch(`/api/businesses/${d.businessId}/reports`)
      const stats = await r.json()
      setData(stats)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="space-y-6">
      <div className="page-header"><div><h1 className="page-title">Reportes</h1></div></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
      </div>
      <div className="h-64 bg-muted animate-pulse rounded-xl" />
    </div>
  )

  if (!data) return null

  const { monthStats, revenueByMonth, topServices, topClients } = data

  const kpis = [
    { label: "Ingresos del mes", value: `$${monthStats.revenue.toLocaleString("es-AR")}`, icon: TrendingUp },
    { label: "Turnos completados", value: monthStats.completed, icon: CheckCircle },
    { label: "Tasa de ocupación", value: `${monthStats.occupancyRate}%`, icon: Users },
    { label: "Tasa de ausentismo", value: `${monthStats.noShowRate}%`, icon: AlertCircle },
  ]

  const pieData = [
    { name: "Completados", value: monthStats.completed },
    { name: "Cancelados", value: monthStats.cancelled },
    { name: "No se presentó", value: monthStats.noShow },
    { name: "Pendientes", value: monthStats.total - monthStats.completed - monthStats.cancelled - monthStats.noShow },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Estadísticas del mes actual</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0"
                style={{ boxShadow: "0 0 16px rgba(56,189,248,0.25)" }}>
                <k.icon className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-sm text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ingresos últimos 6 meses</CardTitle></CardHeader>
        <CardContent>
          {revenueByMonth.every(d => d.revenue === 0) ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Aún no hay ingresos registrados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByMonth} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString("es-AR")}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString("es-AR")}`, "Ingresos"]} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Estado de turnos</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top services */}
        <Card>
          <CardHeader><CardTitle className="text-base">Servicios más solicitados</CardTitle></CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: COLORS[i] }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <div className="h-1.5 bg-muted rounded-full mt-1">
                        <div className="h-1.5 rounded-full" style={{ width: `${(s.count / topServices[0].count) * 100}%`, backgroundColor: COLORS[i] }} />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top clients */}
        <Card>
          <CardHeader><CardTitle className="text-base">Clientes más frecuentes</CardTitle></CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: COLORS[i] }}>
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.visits} visitas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
