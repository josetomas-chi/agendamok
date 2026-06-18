"use client"

import { useState, useMemo, useRef } from "react"
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, isSameMonth, addMonths, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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
  onAppointmentMoved?: (id: string, newStartTime: string) => void
}

const SLOTS = Array.from({ length: 25 }, (_, i) => ({ h: 8 + Math.floor(i / 2), m: (i % 2) * 30 }))
const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function CalendarView({ appointments, businessId, onNewAppointment, onAppointmentMoved }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("week")
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)
  const dragApptId = useRef<string | null>(null)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const displayDays = view === "day" ? [currentDate] : weekDays

  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate)
    if (view === "month") {
      setCurrentDate(dir === 1 ? addMonths(d, 1) : subMonths(d, 1))
    } else {
      d.setDate(d.getDate() + dir * (view === "week" ? 7 : 1))
      setCurrentDate(d)
    }
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

  // Month grid: 6 rows × 7 cols starting from Monday
  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [currentDate])

  function handleCellClick(day: Date, hour = 9, minute = 0) {
    if (!onNewAppointment) return
    onNewAppointment(
      format(day, "yyyy-MM-dd"),
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    )
  }

  function handleDragStart(e: React.DragEvent, apptId: string) {
    dragApptId.current = apptId
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent, slotKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverSlot(slotKey)
  }

  async function handleDrop(e: React.DragEvent, day: Date, h: number, m: number) {
    e.preventDefault()
    setDragOverSlot(null)
    const id = dragApptId.current
    dragApptId.current = null
    if (!id) return

    const newStartTime = new Date(
      day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0
    ).toISOString()

    onAppointmentMoved?.(id, newStartTime)

    const r = await fetch(`/api/businesses/${businessId}/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime: newStartTime }),
    })
    if (!r.ok) toast.error("No se pudo mover el turno")
  }

  const headerTitle = view === "month"
    ? format(currentDate, "MMMM yyyy", { locale: es })
    : view === "week"
    ? `${format(weekStart, "d MMM", { locale: es })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`
    : format(currentDate, "EEEE d MMMM yyyy", { locale: es })

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10" style={{ background: "#2c2c30" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8" style={{ background: "#2c2c30" }}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="font-semibold text-sm text-white ml-1 capitalize">{headerTitle}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
            {(["month", "week", "day"] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  i > 0 && "border-l border-white/10",
                  view === v ? "bg-sky-500 text-white font-medium" : "text-white/50 hover:text-white hover:bg-white/8"
                )}>
                {v === "month" ? "Mes" : v === "week" ? "Semana" : "Día"}
              </button>
            ))}
          </div>
          <button
            onClick={() => onNewAppointment?.(format(new Date(), "yyyy-MM-dd"), "09:00")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo turno
          </button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {view === "month" && (
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Day name headers */}
            <div className="grid grid-cols-7 border-b border-white/8">
              {WEEK_DAYS.map(d => (
                <div key={d} className="py-2 text-center text-[10px] uppercase tracking-widest text-white/30 font-medium">
                  {d}
                </div>
              ))}
            </div>
            {/* 6-week grid */}
            <div className="grid grid-cols-7" style={{ gridAutoRows: "100px" }}>
              {monthGrid.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const dayAppts = apptsByDay[key] || []
                const isToday = isSameDay(day, new Date())
                const inMonth = isSameMonth(day, currentDate)
                return (
                  <div
                    key={key}
                    onClick={() => { setCurrentDate(day); setView("day") }}
                    className={cn(
                      "border-b border-r border-white/5 p-1.5 cursor-pointer transition-colors group overflow-hidden relative",
                      !inMonth && "opacity-30",
                      "hover:bg-white/[0.03]"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 mx-auto",
                      isToday ? "bg-sky-500 text-white" : "text-white/60"
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayAppts.slice(0, 3).map(a => (
                        <div
                          key={a.id}
                          onClick={e => e.stopPropagation()}
                          className="rounded text-[10px] px-1.5 py-0.5 truncate text-white font-medium leading-tight"
                          style={{ backgroundColor: a.service.color || "#38bdf8" }}
                        >
                          {format(new Date(a.startTime), "HH:mm")} {a.client?.name ?? "Sin cliente"}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <div className="text-[10px] text-white/40 px-1">+{dayAppts.length - 3} más</div>
                      )}
                    </div>
                    {dayAppts.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Plus className="w-3 h-3 text-sky-500/40" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* WEEK / DAY VIEW */}
      {view !== "month" && (
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
              {SLOTS.map(({ h, m }) => (
                <div key={`${h}-${m}`} className="flex"
                  style={{ borderBottom: m === 0 ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.03)" }}>
                  <div className="w-14 flex-shrink-0 pr-3 flex items-start justify-end pt-1">
                    {m === 0 && <span className="text-[10px] text-white/25 tabular-nums">{h}:00</span>}
                  </div>
                  {displayDays.map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd")
                    const slotKey = `${dayKey}-${h}-${m}`
                    const isToday = isSameDay(day, new Date())
                    const isDragOver = dragOverSlot === slotKey
                    const dayAppts = (apptsByDay[dayKey] || []).filter(a => {
                      const d = new Date(a.startTime)
                      return d.getHours() === h && d.getMinutes() === m
                    })
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => { if (dayAppts.length === 0) handleCellClick(day, h, m) }}
                        onDragOver={e => handleDragOver(e, slotKey)}
                        onDragLeave={() => setDragOverSlot(null)}
                        onDrop={e => handleDrop(e, day, h, m)}
                        className={cn(
                          "flex-1 min-h-[28px] px-0.5 py-0.5 relative group border-l border-white/5 transition-colors",
                          isToday && !isDragOver && "bg-sky-500/[0.03]",
                          isDragOver && "bg-sky-500/20",
                          dayAppts.length === 0 && onNewAppointment && !isDragOver && "cursor-pointer hover:bg-white/[0.03]"
                        )}
                      >
                        {isDragOver && <div className="absolute inset-0 border-2 border-sky-400/50 rounded pointer-events-none" />}
                        {dayAppts.length === 0 && onNewAppointment && !isDragOver && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3.5 h-3.5 text-sky-500/60" />
                          </div>
                        )}
                        {dayAppts.map((a) => (
                          <div
                            key={a.id}
                            draggable
                            onDragStart={e => handleDragStart(e, a.id)}
                            onClick={e => e.stopPropagation()}
                            className="rounded-lg text-xs p-2 mb-0.5 cursor-grab active:cursor-grabbing select-none transition-all hover:brightness-110 hover:shadow-lg active:opacity-60 active:scale-95"
                            style={{
                              background: a.service.color
                                ? `linear-gradient(135deg, ${a.service.color}ee, ${a.service.color}bb)`
                                : "linear-gradient(135deg, #38bdf8ee, #38bdf8bb)",
                              boxShadow: `0 2px 8px ${a.service.color || "#38bdf8"}40`,
                            }}
                          >
                            <div className="font-semibold text-white truncate leading-tight">{a.client?.name ?? "Sin cliente"}</div>
                            <div className="text-white/75 truncate text-[10px] mt-0.5 leading-tight">{a.service.name}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-t border-white/8">
        {[
          { label: "Pendiente", hex: "#facc15" },
          { label: "Confirmado", hex: "#22c55e" },
          { label: "Completado", hex: "#3b82f6" },
          { label: "Cancelado", hex: "#f87171" },
          { label: "No se presentó", hex: "#fb923c" },
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
