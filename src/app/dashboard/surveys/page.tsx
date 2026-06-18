"use client"

import { useState, useEffect, useCallback } from "react"
import { Star, TrendingUp, MessageSquare, Users } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Survey = {
  id: string
  rating: number
  comment: string | null
  answeredAt: string
  appointment: {
    startTime: string
    service: { name: string }
    staff: { id: string; color: string; user: { name: string | null } }
    client: { name: string }
  }
}

const STAR_COLOR = ["", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"]
const STAR_LABEL = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"]

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [avg, setAvg] = useState<number | null>(null)
  const [byRating, setByRating] = useState<{ rating: number; count: number }[]>([])
  const [total, setTotal] = useState(0)
  const [businessId, setBusinessId] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (bid: string) => {
    setLoading(true)
    const r = await fetch(`/api/businesses/${bid}/surveys`)
    const d = await r.json()
    setSurveys(d.surveys || [])
    setAvg(d.avg)
    setByRating(d.byRating || [])
    setTotal(d.total || 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(d => {
      setBusinessId(d.businessId)
      load(d.businessId)
    })
  }, [load])

  const maxCount = Math.max(...byRating.map(r => r.count), 1)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Encuestas de satisfacción</h1>
          <p className="page-subtitle">Se envían automáticamente al completar un turno</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{avg !== null ? avg.toFixed(1) : "—"}</p>
            <p className="text-xs text-white/40">Promedio general</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{total}</p>
            <p className="text-xs text-white/40">Respuestas recibidas</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {total > 0 ? `${Math.round((byRating.filter(r => r.rating >= 4).reduce((s, r) => s + r.count, 0) / total) * 100)}%` : "—"}
            </p>
            <p className="text-xs text-white/40">Satisfacción alta (4–5★)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating distribution */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Distribución de puntajes</h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(r => {
              const item = byRating.find(b => b.rating === r)
              const count = item?.count ?? 0
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
              return (
                <div key={r} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16 flex-shrink-0">
                    <Star className="w-3.5 h-3.5" fill={STAR_COLOR[r]} stroke={STAR_COLOR[r]} />
                    <span className="text-xs text-white/50">{r}</span>
                  </div>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: STAR_COLOR[r] }}
                    />
                  </div>
                  <span className="text-xs text-white/40 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent reviews */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Opiniones recientes</h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aún no hay respuestas</p>
              <p className="text-xs mt-1">Se envían al completar un turno</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {surveys.map(s => (
                <div key={s.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-xs font-bold flex-shrink-0">
                        {s.appointment.client.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{s.appointment.client.name}</p>
                        <p className="text-xs text-white/30">{s.appointment.service.name} · {s.appointment.staff.user.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className="w-3.5 h-3.5"
                          fill={n <= s.rating ? STAR_COLOR[s.rating] : "none"}
                          stroke={n <= s.rating ? STAR_COLOR[s.rating] : "#ffffff20"}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                  </div>
                  {s.comment && (
                    <p className="text-sm text-white/50 italic pl-9">"{s.comment}"</p>
                  )}
                  <p className="text-xs text-white/20 pl-9 mt-1">
                    {format(new Date(s.answeredAt), "d MMM yyyy", { locale: es })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
