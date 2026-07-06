"use client"

import { useState, useRef } from "react"
import { addDays, format, startOfDay, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight } from "lucide-react"

type Appointment = {
  id: string
  startTimeISO: string
  staffId: string | null
  businessId: string
  service: { name: string; duration: number; color: string }
  staff: string | null
  business: { name: string; slug: string }
  status: string
  isPast: boolean
}

interface Props {
  appointments: Appointment[]
  onRescheduled: (id: string, newStartISO: string) => void
}

const HOUR_START = 8
const HOUR_END = 21
const SLOT_MIN = 30
const SLOT_H = 40 // px per 30-min slot
const SLOTS = Array.from(
  { length: ((HOUR_END - HOUR_START) * 60) / SLOT_MIN },
  (_, i) => {
    const totalMin = HOUR_START * 60 + i * SLOT_MIN
    return { h: Math.floor(totalMin / 60), m: totalMin % 60 }
  }
)

export function ClientCalendar({ appointments, onRescheduled }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()))
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const dragApptId = useRef<string | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function apptsByDay(day: Date) {
    return appointments.filter(a => {
      if (a.isPast || a.status === "CANCELLED") return false
      return isSameDay(new Date(a.startTimeISO), day)
    })
  }

  function topPx(iso: string) {
    const d = new Date(iso)
    const h = d.getHours()
    const m = d.getMinutes()
    return ((h - HOUR_START) * 60 + m) / SLOT_MIN * SLOT_H
  }

  function heightPx(duration: number) {
    return (duration / SLOT_MIN) * SLOT_H
  }

  async function handleDrop(day: Date, h: number, m: number) {
    const id = dragApptId.current
    dragApptId.current = null
    setDragId(null)
    setDragOver(null)
    if (!id || saving) return

    // Build new startTime in local timezone
    const newStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0)

    if (newStart < new Date()) {
      toast.error("No puedes reagendar a un horario que ya pasó")
      return
    }

    setSaving(true)
    const r = await fetch(`/api/public/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime: newStart.toISOString() }),
    })
    setSaving(false)

    if (r.ok) {
      toast.success("Turno reagendado")
      onRescheduled(id, newStart.toISOString())
    } else {
      const d = await r.json()
      toast.error(d.error || "No se pudo reagendar")
    }
  }

  const today = startOfDay(new Date())

  return (
    <div className="select-none">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekStart(d => addDays(d, -7))}
          disabled={weekStart <= today}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-white/50" />
        </button>
        <span className="text-sm text-white/60 font-medium">
          {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
        </span>
        <button
          onClick={() => setWeekStart(d => addDays(d, 7))}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {saving && (
        <div className="text-center text-xs text-sky-400 mb-2 animate-pulse">Guardando cambio...</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/[0.07]" style={{ background: "oklch(0.18 0.02 260)" }}>
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="flex border-b border-white/[0.07]">
            <div className="w-12 flex-shrink-0" />
            {days.map(day => {
              const isToday = isSameDay(day, new Date())
              const isPast = day < today
              return (
                <div key={day.toISOString()} className="flex-1 py-2 text-center border-l border-white/[0.05]">
                  <p className={`text-[10px] uppercase tracking-wider font-medium ${isPast ? "text-white/20" : "text-white/40"}`}>
                    {format(day, "EEE", { locale: es })}
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${isToday ? "text-sky-400" : isPast ? "text-white/20" : "text-white/70"}`}>
                    {format(day, "d")}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Time grid */}
          <div className="flex">
            {/* Hour labels */}
            <div className="w-12 flex-shrink-0 relative" style={{ height: SLOTS.length * SLOT_H }}>
              {SLOTS.filter(s => s.m === 0).map(({ h }) => (
                <div
                  key={h}
                  className="absolute right-2 text-[10px] text-white/25 tabular-nums"
                  style={{ top: (h - HOUR_START) * 2 * SLOT_H - 7 }}
                >
                  {h}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map(day => {
              const isPastDay = day < today
              const dayAppts = apptsByDay(day)
              return (
                <div
                  key={day.toISOString()}
                  className="flex-1 relative border-l border-white/[0.05]"
                  style={{ height: SLOTS.length * SLOT_H }}
                >
                  {/* Slot lines + drop zones */}
                  {SLOTS.map(({ h, m }) => {
                    const key = `${format(day, "yyyy-MM-dd")}-${h}-${m}`
                    const isDragOver = dragOver === key
                    return (
                      <div
                        key={key}
                        className={`absolute w-full transition-colors ${
                          isDragOver && !isPastDay ? "bg-sky-500/20" : ""
                        } ${!isPastDay && dragId ? "cursor-copy" : ""}`}
                        style={{
                          top: ((h - HOUR_START) * 60 + m) / SLOT_MIN * SLOT_H,
                          height: SLOT_H,
                          borderBottom: m === 0 ? "1px solid rgba(255,255,255,0.06)" : "1px dashed rgba(255,255,255,0.02)",
                        }}
                        onDragOver={e => {
                          if (isPastDay) return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = "move"
                          setDragOver(key)
                        }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={e => {
                          e.preventDefault()
                          if (!isPastDay) handleDrop(day, h, m)
                        }}
                      >
                        {isDragOver && !isPastDay && (
                          <div className="absolute inset-0 border-2 border-sky-400/50 rounded pointer-events-none" />
                        )}
                      </div>
                    )
                  })}

                  {/* Appointment chips */}
                  {dayAppts.map(a => (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.effectAllowed = "move"
                        dragApptId.current = a.id
                        setDragId(a.id)
                      }}
                      onDragEnd={() => {
                        setDragId(null)
                        setDragOver(null)
                      }}
                      className={`absolute left-0.5 right-0.5 rounded-lg px-2 py-1 cursor-grab active:cursor-grabbing overflow-hidden transition-opacity ${
                        dragId === a.id ? "opacity-40" : "opacity-100"
                      }`}
                      style={{
                        top: topPx(a.startTimeISO),
                        height: Math.max(heightPx(a.service.duration), SLOT_H) - 2,
                        background: a.service.color + "33",
                        borderLeft: `3px solid ${a.service.color}`,
                        zIndex: 10,
                      }}
                      title="Arrastra para reagendar"
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: a.service.color }}>
                        {a.service.name}
                      </p>
                      <p className="text-[10px] text-white/50 truncate">{a.business.name}</p>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-white/25 text-center mt-2">Arrastra una reserva a otro horario para reagendarla</p>
    </div>
  )
}
