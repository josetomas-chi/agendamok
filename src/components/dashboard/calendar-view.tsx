"use client"

import { useState, useMemo } from "react"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
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

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8:00 - 20:00

export function CalendarView({ appointments, onNewAppointment }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"week" | "day">("week")

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function navigate(dir: 1 | -1) {
    const delta = view === "week" ? 7 : 1
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir * delta)
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

  const displayDays = view === "day" ? [currentDate] : weekDays

  function handleCellClick(day: Date, hour: number) {
    if (!onNewAppointment) return
    const date = format(day, "yyyy-MM-dd")
    const time = `${String(hour).padStart(2, "0")}:00`
    onNewAppointment(date, time)
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold text-sm ml-2">
            {view === "week"
              ? `${format(weekStart, "d MMM", { locale: es })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`
              : format(currentDate, "EEEE d MMMM yyyy", { locale: es })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>Semana</Button>
          <Button variant={view === "day" ? "default" : "outline"} size="sm" onClick={() => setView("day")}>Dia</Button>
          <Button size="sm" onClick={() => onNewAppointment?.(format(new Date(), "yyyy-MM-dd"), "09:00")}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo turno
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px] max-h-[660px] overflow-y-auto">
          {/* Day headers — sticky dentro del scroll */}
          <div className="flex border-b bg-white sticky top-0 z-10">
            <div className="w-16 flex-shrink-0 py-2 px-3 text-xs text-muted-foreground" />
            {displayDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn("flex-1 py-2 px-3 text-center text-xs font-medium border-l", isSameDay(day, new Date()) && "bg-indigo-50")}
              >
                <div className="text-muted-foreground uppercase">{format(day, "EEE", { locale: es })}</div>
                <div className={cn("text-lg font-semibold mt-0.5", isSameDay(day, new Date()) && "text-indigo-600")}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div>
            {HOURS.map((hour) => (
              <div key={hour} className="flex border-b">
                <div className="w-16 flex-shrink-0 py-3 px-3 text-xs text-muted-foreground text-right border-r">
                  {hour}:00
                </div>
                {displayDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd")
                  const dayAppts = (apptsByDay[key] || []).filter(a => new Date(a.startTime).getHours() === hour)
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => { if (dayAppts.length === 0) handleCellClick(day, hour) }}
                      className={cn(
                        "flex-1 border-l min-h-[60px] p-1 relative transition-colors",
                        isSameDay(day, new Date()) && "bg-indigo-50/30",
                        dayAppts.length === 0 && onNewAppointment && "cursor-pointer hover:bg-indigo-50/60 group"
                      )}
                    >
                      {dayAppts.length === 0 && onNewAppointment && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-4 h-4 text-indigo-400" />
                        </div>
                      )}
                      {dayAppts.map((a) => (
                        <div
                          key={a.id}
                          className="rounded text-xs p-1 mb-1 text-white cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ backgroundColor: a.service.color }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="font-medium truncate">{a.client.name}</div>
                          <div className="opacity-80 truncate">{a.service.name}</div>
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

      {/* Status legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-t text-xs text-muted-foreground">
        {[
          { label: "Pendiente", color: "bg-yellow-400" },
          { label: "Confirmado", color: "bg-green-500" },
          { label: "Completado", color: "bg-gray-400" },
          { label: "Cancelado", color: "bg-red-400" },
          { label: "No se presentó", color: "bg-orange-400" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${s.color}`} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}
