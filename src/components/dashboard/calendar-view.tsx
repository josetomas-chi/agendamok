"use client"

import { useState, useMemo, useRef } from "react"
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, isSameMonth, addMonths, subMonths, addWeeks, subWeeks } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"

type Appointment = {
  id: string
  startTime: Date | string
  endTime: Date | string
  status: string
  service: { name: string; color: string }
  staff: { id: string; color: string; user: { name: string | null; image: string | null } }
  client: { name: string }
  payment?: { status: string } | null
}

type StaffMember = {
  id: string
  color: string
  user: { name: string | null; image: string | null }
}

interface Props {
  appointments: Appointment[]
  staffMembers?: StaffMember[]
  businessId: string
  onNewAppointment?: (date: string, time: string, staffId?: string) => void
  onAppointmentMoved?: (id: string, newStartTime: string) => void
  onAppointmentClick?: (id: string) => void
}

const SLOTS = Array.from({ length: 26 }, (_, i) => ({ h: 8 + Math.floor(i / 2), m: (i % 2) * 30 }))
const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const SLOT_H = 30 // px per 30-min slot

export function CalendarView({ appointments, staffMembers = [], businessId, onNewAppointment, onAppointmentMoved, onAppointmentClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"week" | "day">("day")
  const [miniMonth, setMiniMonth] = useState(new Date())
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)
  const dragApptId = useRef<string | null>(null)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const displayDays = view === "day" ? [currentDate] : weekDays

  function navigate(dir: 1 | -1) {
    if (view === "week") {
      setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1))
    } else {
      setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + dir); return n })
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

  // Mini month grid
  const miniGrid = useMemo(() => {
    const ms = startOfMonth(miniMonth)
    const gs = startOfWeek(ms, { weekStartsOn: 1 })
    return Array.from({ length: 42 }, (_, i) => addDays(gs, i))
  }, [miniMonth])

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
    const newStartTime = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0).toISOString()
    onAppointmentMoved?.(id, newStartTime)
    const r = await fetch(`/api/businesses/${businessId}/appointments/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime: newStartTime }),
    })
    if (!r.ok) toast.error("No se pudo mover el turno")
  }

  const headerTitle = view === "week"
    ? `${format(weekStart, "d MMM", { locale: es })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`
    : format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es })

  // Derive staff columns: use staffMembers prop, or fall back to unique staff from appointments
  const staffCols: StaffMember[] = useMemo(() => {
    if (staffMembers.length > 0) return staffMembers
    const seen = new Set<string>()
    const out: StaffMember[] = []
    for (const a of appointments) {
      if (!seen.has(a.staff.id)) {
        seen.add(a.staff.id)
        out.push({ id: a.staff.id, color: a.staff.color, user: a.staff.user })
      }
    }
    return out
  }, [staffMembers, appointments])

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "#28282c", boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)" }}>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 px-3 md:px-5 py-3 border-b border-white/8 flex-shrink-0" style={{ background: "#2c2c30" }}>
        <div className="flex items-center justify-between gap-2">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setCurrentDate(new Date()); setMiniMonth(new Date()) }}
              className="px-3 py-1 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/8 transition-colors border border-white/10"
            >
              Hoy
            </button>
            <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
              {(["day", "week"] as const).map((v, i) => (
                <button key={v} onClick={() => setView(v)}
                  className={cn("px-2.5 py-1.5 transition-colors", i > 0 && "border-l border-white/10",
                    view === v ? "bg-sky-500 text-white font-medium" : "text-white/50 hover:text-white hover:bg-white/8")}>
                  {v === "day" ? "Día" : "Semana"}
                </button>
              ))}
            </div>
            <button
              onClick={() => onNewAppointment?.(format(currentDate, "yyyy-MM-dd"), "09:00")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Nuevo turno</span><span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>
        {/* Date title — full row on mobile */}
        <h2 className="font-semibold text-sm text-white capitalize">{headerTitle}</h2>
      </div>

      {/* Body: mini calendar + main grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: mini month calendar — hidden on mobile */}
        <div className="hidden md:flex w-52 flex-shrink-0 border-r border-white/8 p-3 flex-col gap-3" style={{ background: "#252528" }}>
          {/* Mini month nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setMiniMonth(d => subMonths(d, 1))} className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold text-white/70 capitalize">
              {format(miniMonth, "MMMM yyyy", { locale: es })}
            </span>
            <button onClick={() => setMiniMonth(d => addMonths(d, 1))} className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-0">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-[9px] uppercase text-white/25 font-medium pb-1">{d[0]}</div>
            ))}
            {miniGrid.map(day => {
              const key = format(day, "yyyy-MM-dd")
              const inMonth = isSameMonth(day, miniMonth)
              const isToday = isSameDay(day, new Date())
              const isSelected = isSameDay(day, currentDate)
              const hasAppts = (apptsByDay[key] || []).length > 0
              return (
                <button
                  key={key}
                  onClick={() => { setCurrentDate(day); setMiniMonth(day); setView("day") }}
                  className={cn(
                    "w-full aspect-square flex items-center justify-center text-[11px] rounded-full transition-colors relative",
                    !inMonth && "text-white/15",
                    inMonth && !isSelected && !isToday && "text-white/50 hover:bg-white/10",
                    isToday && !isSelected && "text-sky-400 font-bold",
                    isSelected && "bg-sky-500 text-white font-bold",
                  )}
                >
                  {format(day, "d")}
                  {hasAppts && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400/70" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Staff legend */}
          {staffCols.length > 0 && (
            <div className="border-t border-white/8 pt-3 space-y-2">
              <p className="text-[10px] uppercase text-white/25 font-medium tracking-wider">Profesionales</p>
              {staffCols.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-white/50 truncate">{s.user.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: main calendar grid */}
        <div className="flex-1 overflow-auto">
          {view === "day" ? (
            <DayStaffView
              day={currentDate}
              staffCols={staffCols}
              apptsByDay={apptsByDay}
              dragOverSlot={dragOverSlot}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={handleDrop}
              onNewAppointment={onNewAppointment}
              onAppointmentClick={onAppointmentClick}
            />
          ) : (
            <WeekView
              displayDays={displayDays}
              apptsByDay={apptsByDay}
              dragOverSlot={dragOverSlot}
              currentDate={currentDate}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={handleDrop}
              onNewAppointment={onNewAppointment}
              onAppointmentClick={onAppointmentClick}
              onDayClick={(day) => { setCurrentDate(day); setView("day") }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── DAY VIEW: columns per staff ─────────────────────────────────────────────

function DayStaffView({ day, staffCols, apptsByDay, dragOverSlot, onDragStart, onDragOver, onDragLeave, onDrop, onNewAppointment, onAppointmentClick }: {
  day: Date
  staffCols: StaffMember[]
  apptsByDay: Record<string, Appointment[]>
  dragOverSlot: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, key: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, day: Date, h: number, m: number) => void
  onNewAppointment?: (date: string, time: string, staffId?: string) => void
  onAppointmentClick?: (id: string) => void
}) {
  const dayKey = format(day, "yyyy-MM-dd")
  const dayAppts = apptsByDay[dayKey] || []

  const cols = staffCols.length > 0 ? staffCols : [null]

  return (
    <div className="min-w-[500px]">
      {/* Staff headers */}
      <div className="flex sticky top-0 z-10 border-b border-white/8" style={{ background: "#2c2c30" }}>
        <div className="w-14 flex-shrink-0" />
        {cols.map((s) => (
          <div key={s?.id ?? "all"} className="flex-1 py-3 flex flex-col items-center gap-1 border-l border-white/8">
            {s ? (
              <>
                {s.user.image ? (
                  <Image src={s.user.image} alt={s.user.name || ""} width={32} height={32}
                    className="w-8 h-8 rounded-full object-cover"
                    style={{ outline: `2px solid ${s.color}`, outlineOffset: "1px" }} />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: s.color }}>
                    {s.user.name?.[0] || "?"}
                  </div>
                )}
                <span className="text-xs text-white/60 font-medium truncate max-w-[90px]">{s.user.name}</span>
              </>
            ) : (
              <span className="text-xs text-white/40">Todos</span>
            )}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex">
        {/* Hour labels column */}
        <div className="w-14 flex-shrink-0 relative" style={{ height: SLOTS.length * SLOT_H }}>
          {SLOTS.filter(s => s.m === 0).map(({ h }) => (
            <div key={h} className="absolute right-3 text-[10px] font-medium text-white/30 tabular-nums"
              style={{ top: (h - 8) * 2 * SLOT_H }}>
              {h}:00
            </div>
          ))}
        </div>

        {/* Staff columns */}
        {cols.map((s, colIdx) => {
          const colAppts = dayAppts.filter(a => !s || a.staff.id === s.id)
          return (
            <div key={s?.id ?? "all"} className="flex-1 relative border-l border-white/5"
              style={{
                height: SLOTS.length * SLOT_H,
                background: colIdx % 2 === 1 ? "rgba(255,255,255,0.012)" : undefined,
              }}>
              {/* Slot lines + click zones */}
              {SLOTS.map(({ h, m }) => {
                const slotKey = `${dayKey}-${s?.id ?? "all"}-${h}-${m}`
                const isDragOver = dragOverSlot === slotKey
                return (
                  <div key={slotKey}
                    onClick={() => onNewAppointment?.(dayKey, `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`, s?.id)}
                    onDragOver={e => onDragOver(e, slotKey)}
                    onDragLeave={onDragLeave}
                    onDrop={e => onDrop(e, day, h, m)}
                    className={cn("absolute w-full cursor-pointer group", isDragOver && "bg-sky-500/20")}
                    style={{
                      top: ((h - 8) * 2 + m / 30) * SLOT_H,
                      height: SLOT_H,
                      borderBottom: m === 0 ? "1px solid rgba(255,255,255,0.07)" : "1px dashed rgba(255,255,255,0.025)",
                    }}>
                    {isDragOver && <div className="absolute inset-0 border-2 border-sky-400/50 rounded pointer-events-none" />}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Plus className="w-3 h-3 text-sky-500/40" />
                    </div>
                  </div>
                )
              })}

              {/* Appointments absolutely positioned by time */}
              {colAppts.map(a => {
                const start = new Date(a.startTime)
                const end = new Date(a.endTime)
                const startMins = (start.getHours() - 8) * 60 + start.getMinutes()
                const durMins = Math.max(30, (end.getTime() - start.getTime()) / 60000)
                const top = (startMins / 30) * SLOT_H
                const height = (durMins / 30) * SLOT_H - 4
                return (
                  <div key={a.id} className="absolute left-1 right-1 z-10" style={{ top: top + 2, height }}>
                    <ApptCard appt={a} onDragStart={onDragStart} onApptClick={onAppointmentClick} height={height} />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Staff footer — sticky bottom */}
      <div className="flex sticky bottom-0 z-10 border-t border-white/8" style={{ background: "#2c2c30" }}>
        <div className="w-14 flex-shrink-0" />
        {cols.map((s) => (
          <div key={s?.id ?? "all"} className="flex-1 py-3 flex flex-col items-center gap-1 border-l border-white/8">
            {s ? (
              <>
                {s.user.image ? (
                  <Image src={s.user.image} alt={s.user.name || ""} width={32} height={32}
                    className="w-8 h-8 rounded-full object-cover"
                    style={{ outline: `2px solid ${s.color}`, outlineOffset: "1px" }} />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: s.color }}>
                    {s.user.name?.[0] || "?"}
                  </div>
                )}
                <span className="text-xs text-white/60 font-medium truncate max-w-[90px]">{s.user.name}</span>
              </>
            ) : (
              <span className="text-xs text-white/40">Todos</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────

function WeekView({ displayDays, apptsByDay, dragOverSlot, currentDate, onDragStart, onDragOver, onDragLeave, onDrop, onNewAppointment, onAppointmentClick, onDayClick }: {
  displayDays: Date[]
  apptsByDay: Record<string, Appointment[]>
  dragOverSlot: string | null
  currentDate: Date
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, key: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, day: Date, h: number, m: number) => void
  onNewAppointment?: (date: string, time: string) => void
  onAppointmentClick?: (id: string) => void
  onDayClick: (day: Date) => void
}) {
  return (
    <div className="min-w-[600px]">
      {/* Day headers */}
      <div className="flex sticky top-0 z-10 border-b border-white/8" style={{ background: "#2c2c30" }}>
        <div className="w-14 flex-shrink-0" />
        {displayDays.map(day => {
          const isToday = isSameDay(day, new Date())
          const isSelected = isSameDay(day, currentDate)
          return (
            <button key={day.toISOString()} onClick={() => onDayClick(day)}
              className="flex-1 py-3 text-center hover:bg-white/[0.03] transition-colors">
              <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
                {format(day, "EEE", { locale: es })}
              </div>
              <div className={cn(
                "text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                isToday && !isSelected ? "text-sky-400" : "",
                isSelected ? "bg-sky-500 text-white" : "text-white/70"
              )}>
                {format(day, "d")}
              </div>
            </button>
          )
        })}
      </div>

      {/* Slots */}
      {SLOTS.map(({ h, m }) => (
        <div key={`${h}-${m}`} className="flex"
          style={{ borderBottom: m === 0 ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,255,255,0.02)", minHeight: `${SLOT_H}px` }}>
          <div className="w-14 flex-shrink-0 pr-3 flex items-start justify-end pt-1">
            {m === 0 && <span className="text-[10px] text-white/25 tabular-nums">{h}:00</span>}
          </div>
          {displayDays.map(day => {
            const dayKey = format(day, "yyyy-MM-dd")
            const slotKey = `${dayKey}-${h}-${m}`
            const isToday = isSameDay(day, new Date())
            const isDragOver = dragOverSlot === slotKey
            const slotAppts = (apptsByDay[dayKey] || []).filter(a => {
              const d = new Date(a.startTime)
              return d.getHours() === h && d.getMinutes() === m
            })
            return (
              <div
                key={day.toISOString()}
                onClick={() => { if (slotAppts.length === 0 && onNewAppointment) onNewAppointment(dayKey, `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`) }}
                onDragOver={e => onDragOver(e, slotKey)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, day, h, m)}
                className={cn(
                  "flex-1 px-0.5 py-0.5 border-l border-white/5 transition-colors group relative",
                  isToday && !isDragOver && "bg-sky-500/[0.03]",
                  isDragOver && "bg-sky-500/20",
                  slotAppts.length === 0 && onNewAppointment && !isDragOver && "cursor-pointer hover:bg-white/[0.03]"
                )}
              >
                {isDragOver && <div className="absolute inset-0 border-2 border-sky-400/50 rounded pointer-events-none" />}
                {slotAppts.length === 0 && onNewAppointment && !isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Plus className="w-3 h-3 text-sky-500/50" />
                  </div>
                )}
                {slotAppts.length > 0 && (
                  <div className={slotAppts.length > 1 ? "flex gap-0.5" : ""}>
                    {slotAppts.map(a => <ApptCard key={a.id} appt={a} compact onDragStart={onDragStart} onApptClick={onAppointmentClick} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── APPOINTMENT CARD ─────────────────────────────────────────────────────────

function ApptCard({ appt, compact, height, onDragStart, onApptClick }: {
  appt: Appointment
  compact?: boolean
  height?: number
  onDragStart: (e: React.DragEvent, id: string) => void
  onApptClick?: (id: string) => void
}) {
  const color = appt.service.color || "#38bdf8"
  const isCompleted = appt.status === "COMPLETED"
  const isPaid = appt.payment?.status === "PAID"
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, appt.id)}
      onClick={e => { e.stopPropagation(); onApptClick?.(appt.id) }}
      className="rounded-lg text-xs p-2 cursor-pointer select-none transition-all hover:brightness-110 hover:shadow-lg active:opacity-60 active:scale-95 w-full h-full relative overflow-hidden"
      style={{
        background: isCompleted
          ? `linear-gradient(135deg, ${color}66, ${color}44)`
          : `linear-gradient(135deg, ${color}ee, ${color}99)`,
        boxShadow: `0 2px 8px ${color}40`,
        opacity: isCompleted ? 0.7 : 1,
      }}
    >
      <div className="font-semibold text-white truncate leading-tight pr-5">{appt.client?.name ?? "Sin cliente"}</div>
      {(height === undefined || height > 44) && (
        <div className="text-white/75 truncate text-[10px] mt-0.5 leading-tight">{appt.service.name}</div>
      )}
      {(height === undefined || height > 36) && (
        <div className="text-white/60 text-[10px] leading-tight mt-0.5">
          {format(new Date(appt.startTime), "HH:mm")} – {format(new Date(appt.endTime), "HH:mm")}
        </div>
      )}
      {/* Badges */}
      <div className="absolute top-1.5 right-1.5 flex gap-0.5">
        {isPaid && (
          <span className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center text-[9px] font-bold text-white leading-none">$</span>
        )}
        {isCompleted && (
          <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px] font-bold text-white leading-none">✓</span>
        )}
      </div>
    </div>
  )
}
