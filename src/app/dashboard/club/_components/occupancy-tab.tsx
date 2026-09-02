"use client"
import { useEffect, useState } from "react"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 07–22

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"

function pct(booked: number, available: number) {
  if (available === 0) return null // no disponible ese día/hora
  return Math.min(100, Math.round((booked / available) * 100))
}

function heatColor(p: number) {
  // 0% → gris claro   50% → dorado   100% → rojo-naranja
  if (p === 0)   return { bg: "rgba(13,27,42,0.05)", text: "rgba(13,27,42,0.2)" }
  if (p < 25)    return { bg: "rgba(56,189,248,0.18)", text: "#0369a1" }
  if (p < 50)    return { bg: "rgba(56,189,248,0.45)", text: "#075985" }
  if (p < 75)    return { bg: `rgba(201,168,76,0.55)`, text: "#7c5a10" }
  if (p < 90)    return { bg: "rgba(234,88,12,0.55)",  text: "#9a3412" }
  return              { bg: "rgba(185,28,28,0.65)",  text: "#ffffff" }
}

type Court = { id: string; name: string; color: string }
type Cell  = { booked: number; available: number }
type HeatmapRow = Record<number, Record<number, Cell>>

export default function OccupancyTab({ businessId }: { businessId: string }) {
  const [courts, setCourts]   = useState<Court[]>([])
  const [heatmap, setHeatmap] = useState<Record<string, HeatmapRow>>({})
  const [selected, setSelected] = useState<string>("")
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/businesses/${businessId}/court-bookings/occupancy`)
      .then(r => r.json())
      .then(d => {
        setCourts(d.courts ?? [])
        setHeatmap(d.heatmap ?? {})
        setSelected(d.courts?.[0]?.id ?? "")
      })
      .finally(() => setLoading(false))
  }, [businessId])

  const courtData = heatmap[selected]
  const court     = courts.find(c => c.id === selected)

  // Summary stats for selected court
  const allCells = courtData
    ? Object.values(courtData).flatMap(dayMap => Object.values(dayMap))
    : []
  const totalBooked    = allCells.reduce((s, c) => s + c.booked, 0)
  const totalAvailable = allCells.reduce((s, c) => s + c.available, 0)
  const globalPct = totalAvailable > 0 ? Math.round((totalBooked / totalAvailable) * 100) : 0

  // Best and worst slot
  type SlotPct = { day: number; hour: number; p: number }
  const slots: SlotPct[] = courtData
    ? DAYS.flatMap((_, d) =>
        HOURS.map(h => {
          const cell = courtData[d]?.[h]
          const p = cell ? pct(cell.booked, cell.available) : null
          return p !== null ? { day: d, hour: h, p } : null
        }).filter(Boolean) as SlotPct[]
      )
    : []
  const best  = slots.length ? slots.reduce((a, b) => b.p > a.p ? b : a) : null
  const worst = slots.filter(s => s.p !== null).length
    ? slots.reduce((a, b) => b.p < a.p ? b : a) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "rgba(13,27,42,0.35)" }}>Calculando ocupación…</div>
      </div>
    )
  }

  if (courts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "rgba(13,27,42,0.35)" }}>No hay canchas activas.</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + selector de cancha */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: NAVY }}>Ocupación últimos 30 días</h3>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(13,27,42,0.4)" }}>% de minutos disponibles que tuvieron reserva confirmada</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {courts.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={selected === c.id
                ? { background: "#ffffff", color: NAVY, border: `2px solid ${c.color}`, boxShadow: `0 0 0 1px ${c.color}22` }
                : { background: "rgba(13,27,42,0.04)", color: "rgba(13,27,42,0.45)", border: "1px solid rgba(13,27,42,0.1)" }}>
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      {court && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Ocupación global",
              value: `${globalPct}%`,
              sub: "del tiempo disponible",
              color: globalPct >= 70 ? "#dc2626" : globalPct >= 40 ? GOLD : "#0369a1",
            },
            {
              label: "Mejor slot",
              value: best ? `${DAYS[best.day]} ${best.hour}:00` : "—",
              sub: best ? `${best.p}% ocupado` : "",
              color: "#dc2626",
            },
            {
              label: "Slot más libre",
              value: worst ? `${DAYS[worst.day]} ${worst.hour}:00` : "—",
              sub: worst ? `${worst.p}% ocupado` : "",
              color: "#0369a1",
            },
          ].map(k => (
            <div key={k.label} className="rounded-xl p-3.5"
              style={{ background: "#ffffff", border: "1px solid rgba(201,168,76,0.2)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.4)" }}>{k.label}</p>
              <p className="text-lg font-black leading-none" style={{ color: k.color }}>{k.value}</p>
              {k.sub && <p className="text-[10px] mt-1" style={{ color: "rgba(13,27,42,0.4)" }}>{k.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Heatmap */}
      {courtData && (
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(13,27,42,0.1)", background: "#ffffff" }}>
          {/* Column headers — days */}
          <div className="grid" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
            <div className="py-2 px-1" />
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-wide"
                style={{ color: "rgba(13,27,42,0.45)", borderLeft: "1px solid rgba(13,27,42,0.06)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Rows — hours */}
          {HOURS.map(h => (
            <div key={h} className="grid" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)", borderTop: "1px solid rgba(13,27,42,0.05)" }}>
              {/* Hour label */}
              <div className="flex items-center justify-end pr-2 py-1">
                <span className="text-[10px] font-semibold" style={{ color: "rgba(13,27,42,0.35)" }}>{String(h).padStart(2,"0")}:00</span>
              </div>

              {/* Cells — one per day */}
              {DAYS.map((_, d) => {
                const cell = courtData[d]?.[h]
                const p = cell ? pct(cell.booked, cell.available) : null
                const { bg, text } = p !== null ? heatColor(p) : { bg: "rgba(13,27,42,0.02)", text: "rgba(13,27,42,0.1)" }
                return (
                  <div key={d} title={p !== null ? `${DAYS[d]} ${h}:00 — ${p}% ocupado` : "Sin horario"}
                    className="flex items-center justify-center py-1.5 cursor-default transition-all"
                    style={{ background: bg, borderLeft: "1px solid rgba(13,27,42,0.06)" }}>
                    <span className="text-[10px] font-black" style={{ color: text }}>
                      {p !== null ? `${p}%` : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.35)" }}>Escala:</span>
        {[
          { label: "0%",    bg: "rgba(13,27,42,0.05)" },
          { label: "1–24%", bg: "rgba(56,189,248,0.35)" },
          { label: "25–49%",bg: "rgba(56,189,248,0.65)" },
          { label: "50–74%",bg: "rgba(201,168,76,0.6)" },
          { label: "75–89%",bg: "rgba(234,88,12,0.6)" },
          { label: "90–100%",bg: "rgba(185,28,28,0.7)" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: l.bg, border: "1px solid rgba(13,27,42,0.08)" }} />
            <span className="text-[10px]" style={{ color: "rgba(13,27,42,0.45)" }}>{l.label}</span>
          </div>
        ))}
        <span className="text-[10px] ml-2" style={{ color: "rgba(13,27,42,0.3)" }}>· Sin fondo = sin horario configurado</span>
      </div>
    </div>
  )
}
