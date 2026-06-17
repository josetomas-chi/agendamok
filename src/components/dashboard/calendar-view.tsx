"use client"

import { useState, useMemo } from "react"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type Appointment = {
  id: string
  startTime: Date | string
  endTime: Date | string
  status: string
  service: { name: string; color: string }
  staff: { user: { name: string | null } }
  client: { name: string }
}

interface Props {
  appointments: Appointment[]
  businessId: string
  onNewAppointment?: (date: string, time: string) => void
}

const SLOTS = Array.from({ length: 25 }, (_, i) => ({ h: 8 + Math.floor(i / 2), m: (i % 2) * 30 }))

export function CalendarView({ appointments, onNewAppointment }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"week" | "day">("week")

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const displayDays = view === "day" ? [currentDate] : weekDays

  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir * (view === "week" ? 7 : 1))
    setCurrentDate(d)
  }

  const apptsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const a of appointments) {
      const key = format(new Date(a.startTime), "yyyy-MM-dd")
      if (!map[key]) map[key] = []
      map[key].push(a)
    }
    return map
  }, [appointments])

  function handleCellClick(day: Date, hour: number, minute = 0) {
    if (!onNewAppointment) return
    onNewAppointment(
      format(day, "yyyy-MM-dd"),
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10" style={{ background: "#2c2c30" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8" style={{ background: "#2c2c30" }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="font-semibold text-sm text-white ml-1">
            {view === "week"
              ? `${format(weekStart, "d MMM", { locale: es })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`
              : format(currentDate, "EEEE d MMMM yyyy", { locale: es })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1.5 transition-colors",
                view === "week" ? "bg-sky-500 text-white font-medium" : "text-white/50 hover:text-white hover:bg-white/8"
              )}
            >
              Semana
            </button>
            <button
              onClick={() => setView("day")}
              className={cn(
                "px-3 py-1.5 border-l border-white/10 transition-colors",
                view === "day" ? "bg-sky-500 text-white font-medium" : "text-white/50 hover:text-white hover:bg-white/8"
              )}
            >
              Día
            </button>
          </div>
          <button
            onClick={() => onNewAppointment?.(format(new Date(), "yyyy-MM-dd"), "09:00")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo turno
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px] max-h-[620px] overflow-y-auto">
          {/* Day headers */}
          <div className="flex sticky top-0 z-10 border-b border-white/8" style={{ background: "#2c2c30" }}>
            <div className="w-14 flex-shrink-0" />
            {displayDays.map((day) => {
              const isToday = isSameDay(day, new Date())
              return (
                <div key={day.toISOString()} className="flex-1 py-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
                    {format(day, "EEE", { locale: es })}
                  </div>
                  <div className={cn(
                    "text-base font-semibold mx-auto w-8 h-8 flex items-center justify-center rounded-full",
                    isToday ? "bg-sky-500 text-white" : "text-white/70"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time slots */}
          <div>
            {SLOTS.map(({ h, m }) => {
              const isHour = m === 0
              return (
                <div
                  key={`${h}-${m}`}
                  className="flex"
                  style={{ borderBottom: isHour ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.03)" }}
                >
                  <div className="w-14 flex-shrink-0 pr-3 flex items-start justify-end pt-1">
                    {isHour && (
                      <span className="text-[10px] text-white/25 tabular-nums">{h}:00</span>
                    )}
                  </div>
                  {displayDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd")
                    const isToday = isSameDay(day, new Date())
                    const dayAppts = (apptsByDay[key] || []).filter(a => {
                      const d = new Date(a.startTime)
                      return d.getHours() === h && d.getMinutes() === m
                    })
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => { if (dayAppts.length === 0) handleCellClick(day, h, m) }}
                        className={cn(
                          "flex-1 min-h-[28px] px-0.5 py-0.5 relative group border-l border-white/5 transition-colors",
                          isToday && "bg-sky-500/[0.03]",
                          dayAppts.length === 0 && onNewAppointment && "cursor-pointer hover:bg-white/[0.03]"
                        )}
                      >
                        {dayAppts.length === 0 && onNewAppointment && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3.5 h-3.5 text-sky-500/60" />
                          </div>
                        )}
                        {dayAppts.map((a) => (
                          <div
                            key={a.id}
                            onClick={e => e.stopPropagation()}
                            className="rounded-lg text-xs p-2 mb-0.5 cursor-pointer select-none transition-all hover:brightness-110 hover:shadow-lg"
                            style={{
                              background: a.service.color
                                ? `linear-gradient(135deg, ${a.service.color}ee, ${a.service.color}bb)`
                                : "linear-gradient(135deg, #38bdf8ee, #38bdf8bb)",
                              boxShadow: `0 2px 8px ${a.service.color || "#38bdf8"}40`,
                            }}
                          >
                            <div className="font-semibold text-white truncate leading-tight">
                              {a.client?.name ?? "Sin cliente"}
                            </div>
                            <div className="text-white/75 truncate text-[10px] mt-0.5 leading-tight">
                              {a.service.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-t border-white/8">
        {[
          { label: "Pendiente",       hex: "#facc15" },
          { label: "Confirmado",      hex: "#22c55e" },
          { label: "Completado",      hex: "#3b82f6" },
          { label: "Cancelado",       hex: "#f87171" },
          { label: "No se presentó",  hex: "#fb923c" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.hex }} />
            <span className="text-[11px] text-white/35">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
