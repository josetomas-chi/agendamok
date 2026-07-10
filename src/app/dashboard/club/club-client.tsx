"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { Trophy, Plus, Calendar, Users, MapPin, Clock, ChevronLeft, ChevronRight, X, ChevronDown, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, subDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import NewBookingModal from "./_components/new-booking-modal"
import CoachesTab from "./_components/coaches-tab"

type Court = { id: string; name: string; sport: string | null; color: string; isActive: boolean }
type Client = { id: string; name: string; email: string | null; phone: string | null }
type Booking = {
  id: string; courtId: string; clientId: string | null
  startTime: string; endTime: string; price: number; status: string; notes: string | null
  recurringGroupId: string | null
  court: Court; client: Client | null
  coach: { id: string; name: string; color: string } | null
}

// 08:00 – 23:00 in 30-min slots
const START_HOUR = 8
const END_HOUR = 23
const SLOT_MINUTES = 30
const SLOT_HEIGHT = 28 // px per 30-min slot
const slots: string[] = []
for (let h = START_HOUR; h < END_HOUR; h++) {
  slots.push(`${String(h).padStart(2, "0")}:00`)
  slots.push(`${String(h).padStart(2, "0")}:30`)
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

// Booking datetimes are stored as UTC (sent without tz from client)
// so we must always display in UTC to match what the user entered
function utcTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}
function utcDate(iso: string, fmt: string) {
  const d = new Date(iso)
  const shifted = new Date(d.getTime() + d.getTimezoneOffset() * 60000)
  return format(shifted, fmt, { locale: es })
}

export default function ClubPageClient({ businessId: initialBusinessId }: { businessId: string }) {
  const businessId = initialBusinessId
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [membersCount, setMembersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"resumen" | "calendario" | "entrenadores">("calendario")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [sportFilter, setSportFilter] = useState<string>("Todos")
  const [newBookingOpen, setNewBookingOpen] = useState(false)
  const [preselect, setPreselect] = useState<{ courtId: string; date: string; startTime: string; endTime: string } | null>(null)
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null)

  const loadWeek = useCallback(async (bid: string) => {
    const today = new Date()
    const from = startOfWeek(today, { weekStartsOn: 1 }).toISOString()
    const to = endOfWeek(today, { weekStartsOn: 1 }).toISOString()
    const safe = async (url: string) => { try { const r = await fetch(url); return r.ok ? r.json() : {} } catch { return {} } }
    const [bData, cData, clData, mData] = await Promise.all([
      safe(`/api/businesses/${bid}/court-bookings?from=${from}&to=${to}`),
      safe(`/api/businesses/${bid}/courts`),
      safe(`/api/businesses/${bid}/clients`),
      safe(`/api/businesses/${bid}/client-memberships`),
    ])
    setAllBookings(bData.bookings || [])
    setCourts((cData.courts || []).filter((c: Court) => c.isActive))
    setClients(clData.clients || [])
    setMembersCount((mData.memberships || []).filter((m: { status: string }) => m.status === "ACTIVE").length)
    setLoading(false)
  }, [])

  const loadDay = useCallback(async (bid: string, date: Date) => {
    const from = startOfDay(date).toISOString()
    const to = endOfDay(date).toISOString()
    try {
      const r = await fetch(`/api/businesses/${bid}/court-bookings?from=${from}&to=${to}`)
      const d = await r.json()
      setDayBookings(d.bookings || [])
    } catch { setDayBookings([]) }
  }, [])

  useEffect(() => {
    if (businessId) { loadWeek(businessId); loadDay(businessId, new Date()) }
  }, [businessId, loadWeek, loadDay])

  useEffect(() => {
    if (businessId) loadDay(businessId, selectedDate)
  }, [selectedDate, businessId, loadDay])

  const todayBookings = allBookings.filter(b => isSameDay(new Date(b.startTime), new Date()))
  const weekBookings = allBookings.length

  function handleSlotClick(courtId: string, slotTime: string) {
    const [h, m] = slotTime.split(":").map(Number)
    const endH = m === 30 ? h + 1 : h
    const endM = m === 30 ? 0 : 30
    setPreselect({
      courtId,
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime: slotTime,
      endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
    })
    setNewBookingOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="hidden md:flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)" }}>
            <Trophy className="w-5 h-5" style={{ color: "#C9A84C" }} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide" style={{ color: "#0d1b2a" }}>Club Deportivo</h1>
            <p className="text-xs font-medium" style={{ color: "rgba(13,27,42,0.45)" }}>Canchas, reservas y membresías</p>
          </div>
        </div>
        {tab === "calendario" && (
          <div className="hidden md:block">
            <MiniCalendarClock selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>
        )}
        <div className="flex justify-end ml-auto">
          {tab !== "entrenadores" && (
            <button onClick={() => { setPreselect(null); setNewBookingOpen(true) }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all"
              style={{ background: "#0d1b2a", border: "1px solid #C9A84C", color: "#C9A84C" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.12)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#0d1b2a" }}>
              <Plus className="w-4 h-4" /> Nueva reserva
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)" }}>
          {(["calendario", "resumen", "entrenadores"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
              style={tab === t ? { background: "#ffffff", color: "#C9A84C", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "rgba(13,27,42,0.4)" }}>
              {t === "calendario" ? "Calendario" : t === "resumen" ? "Resumen" : "Entrenadores"}
            </button>
          ))}
        </div>
        {/* Mobile date nav — only visible on mobile when in calendario tab */}
        {tab === "calendario" && (
          <div className="flex md:hidden items-center gap-2">
            <button onClick={() => setSelectedDate(d => subDays(d, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold capitalize" style={{ color: "#0d1b2a" }}>
              {format(selectedDate, "d MMM", { locale: es })}
            </span>
            <button onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {tab === "resumen" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Canchas activas", value: courts.length, icon: MapPin },
              { label: "Reservas hoy", value: todayBookings.length, icon: Calendar },
              { label: "Reservas esta semana", value: weekBookings, icon: Clock },
              { label: "Socios activos", value: membersCount, icon: Users },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: "#ffffff", border: "1px solid rgba(201,168,76,0.25)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(201,168,76,0.12)" }}>
                  <s.icon className="w-4 h-4" style={{ color: "#C9A84C" }} />
                </div>
                <p className="text-2xl font-black" style={{ color: "#0d1b2a" }}>{loading ? "–" : s.value}</p>
                <p className="text-xs mt-0.5 uppercase tracking-wide font-semibold" style={{ color: "rgba(13,27,42,0.4)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Today list */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.25)", background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
              <p className="text-sm font-black uppercase tracking-wide" style={{ color: "#0d1b2a" }}>Reservas de hoy</p>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#C9A84C" }}>{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
            </div>
            {loading ? (
              <div className="p-8 text-center text-sm" style={{ color: "rgba(13,27,42,0.3)" }}>Cargando…</div>
            ) : todayBookings.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: "rgba(13,27,42,0.3)" }}>Sin reservas para hoy</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
                {todayBookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(b => (
                  <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: b.court.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "#0d1b2a" }}>{b.court.name}{b.court.sport ? ` · ${b.court.sport}` : ""}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.4)" }}>{b.client?.name || "Sin cliente"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: "#0d1b2a" }}>{utcTime(b.startTime)} – {utcTime(b.endTime)}</p>
                      <p className="text-xs font-bold" style={{ color: "#C9A84C" }}>${Number(b.price).toLocaleString("es-CL")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "entrenadores" && <CoachesTab businessId={businessId} />}

      {tab === "calendario" && (() => {
        if (loading) return <CalendarSkeleton />
        const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
        const seen = new Map<string, string>()
        courts.forEach(c => { if (c.sport) { const key = normalize(c.sport); if (!seen.has(key)) seen.set(key, c.sport.trim()) } })
        const sports = ["Todos", ...Array.from(seen.values())]
        const filteredCourts = sportFilter === "Todos" ? courts : courts.filter(c => c.sport && normalize(c.sport) === normalize(sportFilter))
        return (
          <>
            {sports.length > 2 && (
              <div className="flex gap-1 flex-wrap">
                {sports.map(s => (
                  <button key={s} onClick={() => setSportFilter(s)}
                    className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
                    style={sportFilter === s
                      ? { background: "rgba(201,168,76,0.15)", color: "#a07b20", border: "1px solid rgba(201,168,76,0.4)" }
                      : { background: "#ffffff", color: "rgba(13,27,42,0.45)", border: "1px solid rgba(13,27,42,0.1)" }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <CourtCalendar
              courts={filteredCourts}
              bookings={dayBookings}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onSlotClick={handleSlotClick}
              onBookingClick={setDetailBooking}
              businessId={businessId}
              onSaved={() => { loadWeek(businessId); loadDay(businessId, selectedDate) }}
            />
          </>
        )
      })()}

      {newBookingOpen && (
        <NewBookingModal
          businessId={businessId}
          courts={courts}
          clients={clients}
          preselect={preselect}
          onClose={() => { setNewBookingOpen(false); setPreselect(null) }}
          onSaved={() => {
            setNewBookingOpen(false); setPreselect(null)
            loadWeek(businessId); loadDay(businessId, selectedDate)
          }}
        />
      )}

      {detailBooking && (
        <BookingDetail
          booking={detailBooking}
          businessId={businessId}
          clients={clients}
          onClose={() => setDetailBooking(null)}
          onSaved={() => {
            setDetailBooking(null)
            loadWeek(businessId); loadDay(businessId, selectedDate)
          }}
        />
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CalendarSkeleton() {
  const BORDER = "rgba(201,168,76,0.2)"
  const NAVY = "#0d1b2a"
  const skeletonCols = 3
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ border: BORDER, background: "#111f2d", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
      {/* Date nav skeleton */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: BORDER, background: "#111f2d" }}>
        <div className="w-8 h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="w-40 h-4 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="w-8 h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      {/* Grid skeleton */}
      <div className="flex" style={{ minWidth: `${44 + skeletonCols * 130}px` }}>
        {/* Time col */}
        <div className="w-11 flex-shrink-0" style={{ borderRight: BORDER }}>
          <div className="h-8" style={{ borderBottom: BORDER }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start justify-end pr-2.5" style={{ height: 56 }}>
              <div className="w-6 h-2 rounded-full mt-1" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
          ))}
        </div>
        {/* Court cols */}
        {Array.from({ length: skeletonCols }).map((_, ci) => (
          <div key={ci} className="flex-1" style={{ minWidth: 120, borderRight: ci < skeletonCols - 1 ? "1px solid rgba(255,255,255,0.08)" : undefined }}>
            <div className="h-8 flex items-center gap-1.5 px-2" style={{ borderBottom: BORDER, background: NAVY }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
              <div className="w-20 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div style={{ background: "#111f2d", height: 448 }}>
              {/* Fake booking block */}
              {ci === 1 && (
                <div className="mx-1 rounded-md mt-4" style={{ height: 56, background: "rgba(201,168,76,0.12)", borderLeft: "3px solid rgba(201,168,76,0.3)" }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Mini calendar + clock ────────────────────────────────────────────────────

function MiniCalendarClock({ selectedDate, onDateChange }: { selectedDate: Date; onDateChange: (d: Date) => void }) {
  const [now, setNow] = useState(new Date())
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate))

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Sync viewMonth cuando el usuario navega desde las flechas del calendario grande
  useEffect(() => {
    setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }, [selectedDate.getFullYear(), selectedDate.getMonth()])

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  // Lunes como primer día (offset: getDay=0(dom)→6, 1(lun)→0, etc.)
  const startOffset = (getDay(monthStart) + 6) % 7

  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  const ss = String(now.getSeconds()).padStart(2, "0")
  const dayName = format(now, "EEEE", { locale: es })
  const dateStr = format(now, "d 'de' MMMM yyyy", { locale: es })

  const GOLD = "#C9A84C"
  const NAVY = "#0d1b2a"

  return (
    <div className="flex gap-3 mb-1 w-fit">
      {/* Mini calendario mensual */}
      <div className="rounded-xl p-2.5" style={{ background: "#ffffff", border: "1px solid rgba(13,27,42,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", width: 196 }}>
        {/* Mes + flechas */}
        <div className="flex items-center justify-between mb-1.5">
          <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-black/5">
            <ChevronLeft className="w-3 h-3" style={{ color: "rgba(13,27,42,0.4)" }} />
          </button>
          <p className="text-[10px] font-black uppercase tracking-widest capitalize" style={{ color: NAVY }}>
            {format(viewMonth, "MMM yyyy", { locale: es })}
          </p>
          <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-black/5">
            <ChevronRight className="w-3 h-3" style={{ color: "rgba(13,27,42,0.4)" }} />
          </button>
        </div>

        {/* Días de semana */}
        <div className="grid grid-cols-7 mb-0.5">
          {["L","M","X","J","V","S","D"].map(d => (
            <div key={d} className="text-center text-[8px] font-bold uppercase py-0.5" style={{ color: "rgba(13,27,42,0.3)" }}>{d}</div>
          ))}
        </div>

        {/* Grid días */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
          {days.map(day => {
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            return (
              <button key={day.toISOString()} onClick={() => onDateChange(day)}
                className="flex items-center justify-center rounded text-[10px] font-semibold transition-all"
                style={{ height: 22, width: "100%",
                  ...(isSelected ? { background: NAVY, color: "#fff" }
                    : isToday ? { background: "rgba(201,168,76,0.18)", color: GOLD, fontWeight: 800 }
                    : { color: "rgba(13,27,42,0.55)" }) }}>
                {day.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Reloj digital */}
      <div className="rounded-xl px-4 py-2.5 flex flex-col items-center justify-center"
        style={{ background: NAVY, border: "1px solid rgba(201,168,76,0.2)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", minWidth: 120 }}>
        <p className="text-[9px] font-bold uppercase tracking-widest capitalize mb-1" style={{ color: GOLD }}>{dayName}</p>
        <p className="font-black tabular-nums leading-none" style={{ fontSize: "1.5rem", color: "#ffffff", letterSpacing: "0.05em" }}>
          {hh}<span style={{ color: GOLD, animation: "blink 1s step-end infinite" }}>:</span>{mm}
        </p>
        <p className="text-[10px] font-mono mt-0.5 tabular-nums" style={{ color: "rgba(255,255,255,0.4)" }}>{ss}</p>
        <p className="text-[9px] mt-1.5 text-center capitalize" style={{ color: GOLD }}>{dateStr}</p>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}

// ─── Calendar grid ────────────────────────────────────────────────────────────

function CourtCalendar({ courts, bookings, selectedDate, onDateChange, onSlotClick, onBookingClick, businessId, onSaved }: {
  courts: Court[]
  bookings: Booking[]
  selectedDate: Date
  onDateChange: (d: Date) => void
  onSlotClick: (courtId: string, time: string) => void
  onBookingClick: (b: Booking) => void
  businessId: string
  onSaved: () => void
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const selectedDateRef = useRef(selectedDate)
  selectedDateRef.current = selectedDate
  const customDragRef = useRef<{ bookingId: string; durationMins: number; sport: string | null } | null>(null)
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [dragLabel, setDragLabel] = useState("")
  const [dropTarget, setDropTarget] = useState<{ courtId: string; slot: string } | null>(null)

  // Scroll to 08:00 on mount
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 0
  }, [])

  // Custom mouse-based drag (avoids HTML5 DnD browser quirks)
  useEffect(() => {
    function courtAtPoint(x: number, y: number): { courtId: string; courtSport: string | null; slotsEl: HTMLElement } | null {
      const ghost = document.getElementById("booking-drag-ghost")
      if (ghost) ghost.style.display = "none"
      const el = document.elementFromPoint(x, y) as HTMLElement | null
      if (ghost) ghost.style.display = ""
      const col = el?.closest("[data-court-col]") as HTMLElement | null
      if (!col) return null
      const slotsEl = col.querySelector("[data-slots-root]") as HTMLElement | null
      if (!slotsEl) return null
      return { courtId: col.dataset.courtId!, courtSport: col.dataset.courtSport || null, slotsEl }
    }

    function onMouseMove(e: MouseEvent) {
      const info = customDragRef.current
      if (!info) return
      // Don't show drag UI until moved at least 8px
      const start = dragStartPos.current
      if (start && Math.abs(e.clientX - start.x) < 8 && Math.abs(e.clientY - start.y) < 8) return
      setDragPos({ x: e.clientX, y: e.clientY })
      const court = courtAtPoint(e.clientX, e.clientY)
      if (!court || (info.sport || null) !== (court.courtSport || null)) {
        setDropTarget(null)
        return
      }
      const rect = court.slotsEl.getBoundingClientRect()
      const idx = Math.floor((e.clientY - rect.top) / SLOT_HEIGHT)
      const slot = slots[idx] ?? null
      if (slot) setDropTarget({ courtId: court.courtId, slot })
      else setDropTarget(null)
    }

    async function onMouseUp(e: MouseEvent) {
      const info = customDragRef.current
      if (!info) return
      const start = dragStartPos.current
      customDragRef.current = null
      dragStartPos.current = null
      setDraggingId(null)
      setDragPos(null)
      setDropTarget(null)
      // Require at least 8px movement — otherwise it was a click, not a drag
      if (start && Math.abs(e.clientX - start.x) < 8 && Math.abs(e.clientY - start.y) < 8) return
      const court = courtAtPoint(e.clientX, e.clientY)
      if (!court) return
      const rect = court.slotsEl.getBoundingClientRect()
      const idx = Math.floor((e.clientY - rect.top) / SLOT_HEIGHT)
      const slot = slots[idx] ?? null
      if (!slot) return
      const dateStr = format(selectedDateRef.current, "yyyy-MM-dd")
      const startTime = `${dateStr}T${slot}:00`
      const endMins = timeToMinutes(slot) + info.durationMins
      const endH = String(Math.floor(endMins / 60)).padStart(2, "0")
      const endM = String(endMins % 60).padStart(2, "0")
      const endTime = `${dateStr}T${endH}:${endM}:00`
      const r = await fetch(`/api/businesses/${businessId}/court-bookings/${info.bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courtId: court.courtId, startTime, endTime }),
      })
      if (r.ok) onSaved()
      else toast.error("Error al mover la reserva")
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
    return () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, onSaved])

  function handleBookingMouseDown(e: React.MouseEvent, b: Booking) {
    if (b.status === "COMPLETED" || b.status === "CANCELLED") return
    e.preventDefault()
    const durationMins = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000
    customDragRef.current = { bookingId: b.id, durationMins, sport: b.court.sport }
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    setDraggingId(b.id)
    setDragLabel(b.client?.name || "Sin cliente")
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  function getBookingsForCourt(courtId: string) {
    return bookings.filter(b => b.courtId === courtId && b.status !== "CANCELLED")
  }

  function bookingStyle(b: Booking) {
    const startMins = timeToMinutes(utcTime(b.startTime))
    const endMins = timeToMinutes(utcTime(b.endTime))
    const originMins = START_HOUR * 60
    const top = ((startMins - originMins) / SLOT_MINUTES) * SLOT_HEIGHT
    const height = ((endMins - startMins) / SLOT_MINUTES) * SLOT_HEIGHT
    return { top, height: Math.max(height, SLOT_HEIGHT - 2) }
  }

  const GOLD = "#C9A84C"
  const NAVY = "#0d1b2a"
  const BORDER = "rgba(201,168,76,0.2)"
  const SLOT_BORDER_H = "rgba(13,27,42,0.07)"
  const SLOT_BORDER_HALF = "rgba(13,27,42,0.03)"

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: BORDER, background: "#111f2d", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
      {/* Date nav */}
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: BORDER, background: "#111f2d" }}>
        <button onClick={() => onDateChange(subDays(selectedDate, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ border: BORDER, color: GOLD }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-wide capitalize text-white">{format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</p>
          {!isSameDay(selectedDate, new Date()) && (
            <button onClick={() => onDateChange(new Date())} className="text-[10px] font-semibold transition-colors" style={{ color: GOLD }}>Hoy</button>
          )}
        </div>
        <button onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ border: BORDER, color: GOLD }}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {courts.length === 0 ? (
        <div className="p-12 text-center text-sm" style={{ color: "rgba(13,27,42,0.35)" }}>No hay canchas activas. Crea una en la sección Canchas.</div>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-280px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" ref={gridRef}>
          <div className="flex" style={{ minWidth: `${44 + courts.length * 130}px` }}>
            {/* Time column */}
            <div className="w-11 flex-shrink-0" style={{ borderRight: BORDER }}>
              <div className="h-8" style={{ borderBottom: BORDER }} />
              {slots.map((slot) => (
                <div key={slot} className="flex items-start justify-end pr-2.5" style={{ height: SLOT_HEIGHT }}>
                  {slot.endsWith(":00") && (
                    <span className="text-[10px] -mt-2 font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>{slot}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Court columns */}
            {courts.map(court => (
              <div key={court.id} className="flex-1 last:border-r-0" style={{ minWidth: 120, borderRight: "1px solid rgba(255,255,255,0.12)" }}
                data-court-col data-court-id={court.id} data-court-sport={court.sport ?? ""}>
                {/* Court header */}
                <div className="h-8 flex items-center gap-1.5 px-2 sticky top-0 z-10" style={{ borderBottom: BORDER, background: NAVY }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: court.color, boxShadow: `0 0 6px ${court.color}` }} />
                  <span className="text-[11px] font-black uppercase tracking-wide text-white truncate">{court.name}</span>
                  {court.sport && <span className="text-[9px] truncate" style={{ color: "rgba(201,168,76,0.6)" }}>{court.sport}</span>}
                </div>

                {/* Slots */}
                <div className="relative" data-slots-root style={{ background: "#111f2d" }}>
                  {slots.map((slot) => {
                    const isDropOver = dropTarget?.courtId === court.id && dropTarget?.slot === slot
                    return (
                      <div key={slot}
                        data-slot={slot}
                        onClick={() => onSlotClick(court.id, slot)}
                        className="cursor-pointer transition-colors"
                        style={{
                          height: SLOT_HEIGHT,
                          borderBottom: slot.endsWith(":30") ? `1px solid rgba(255,255,255,0.1)` : `1px solid rgba(255,255,255,0.22)`,
                          background: isDropOver ? "rgba(201,168,76,0.18)" : "transparent",
                        }}
                        onMouseEnter={e => { if (!customDragRef.current) (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.07)" }}
                        onMouseLeave={e => { if (!customDragRef.current) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                      />
                    )
                  })}

                  {/* Bookings overlay */}
                  {getBookingsForCourt(court.id).map(b => {
                    const { top, height } = bookingStyle(b)
                    const heightPx = height
                    return (
                      <div key={b.id}
                        onMouseDown={e => { if (e.button === 0) handleBookingMouseDown(e, b) }}
                        onClick={e => { if (!dropTarget) { e.stopPropagation(); onBookingClick(b) } }}
                        className="absolute left-0.5 right-0.5 rounded-md cursor-grab transition-all overflow-hidden z-10 flex items-center justify-center"
                        style={{ top, height,
                          background: b.status === "COMPLETED" ? "rgba(34,197,94,0.55)" : b.coach?.color ? `${b.coach.color}cc` : "rgba(201,168,76,0.85)",
                          borderLeft: `3px solid ${b.status === "COMPLETED" ? "#16a34a" : b.coach?.color ?? "#C9A84C"}`,
                          opacity: draggingId === b.id ? 0.35 : 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(0.92)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "none" }}
                      >
                        {/* Hora — absoluta esquina superior izquierda */}
                        <p className="absolute top-1 left-1.5 text-[9px] font-semibold leading-none" style={{ color: "rgba(13,27,42,0.6)" }}>
                          {utcTime(b.startTime)}–{utcTime(b.endTime)}
                        </p>
                        {/* Badges top-right: R (recurrente) + ✓✓ (completada) */}
                        <div className="absolute top-0.5 right-1 flex items-center gap-0.5">
                          {b.recurringGroupId && (
                            <span className="text-[8px] font-black px-1 rounded leading-none py-0.5"
                              style={{ background: "rgba(13,27,42,0.18)", color: "#0d1b2a" }}>R</span>
                          )}
                          {b.status === "COMPLETED" && (
                            <span className="text-[10px] font-black leading-none" style={{ color: "#16a34a" }}>✓✓</span>
                          )}
                        </div>
                        {/* Nombre + precio — centrados */}
                        <div className="text-center px-1 w-full">
                          <p className="text-[11px] font-black leading-tight truncate" style={{ color: "#0d1b2a" }}>
                            {b.client?.name || "Sin cliente"}
                          </p>
                          {heightPx >= 52 && (
                            <p className="text-[9px] font-bold mt-0.5 text-center" style={{ color: "rgba(13,27,42,0.65)" }}>
                              ${Number(b.price).toLocaleString("es-CL")}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Current time line */}
                  {isSameDay(selectedDate, new Date()) && (() => {
                    const now = new Date()
                    const nowMins = now.getHours() * 60 + now.getMinutes()
                    const originMins = START_HOUR * 60
                    if (nowMins < originMins || nowMins > END_HOUR * 60) return null
                    const top = ((nowMins - originMins) / SLOT_MINUTES) * SLOT_HEIGHT
                    return <div className="absolute left-0 right-0 h-px z-20 pointer-events-none" style={{ top, background: GOLD, boxShadow: `0 0 4px ${GOLD}` }} />
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag ghost — elemento invisible necesario para courtAtPoint */}
      {dragPos && <div id="booking-drag-ghost" className="pointer-events-none fixed" style={{ left: dragPos.x, top: dragPos.y, width: 1, height: 1 }} />}
    </div>
  )
}

// ─── Booking detail modal ─────────────────────────────────────────────────────

const TIME_SLOTS_MODAL: string[] = []
for (let h = 7; h <= 23; h++) {
  TIME_SLOTS_MODAL.push(`${String(h).padStart(2, "0")}:00`)
  if (h < 23) TIME_SLOTS_MODAL.push(`${String(h).padStart(2, "0")}:30`)
}

const STATUS_LABELS: Record<string, string> = { CONFIRMED: "Confirmada", COMPLETED: "Completada", CANCELLED: "Cancelada" }
const STATUS_STYLES: Record<string, { background: string; color: string }> = {
  CONFIRMED: { background: "rgba(201,168,76,0.15)", color: "#C9A84C" },
  COMPLETED: { background: "rgba(34,197,94,0.15)", color: "#4ade80" },
  CANCELLED: { background: "rgba(239,68,68,0.15)", color: "#f87171" },
}

type NewClientForm = { name: string; email: string; phone: string }

function ClientCombobox({ clients, value, onSelect }: {
  clients: Client[]
  value: { id: string; name: string } | null
  onSelect: (v: { id: string; name: string; email?: string; phone?: string } | null) => void
}) {
  const GOLD = "#C9A84C", NAVY = "#0d1b2a", BORDER = "rgba(201,168,76,0.2)"
  const [query, setQuery] = useState(value?.name || "")
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState<NewClientForm | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false) } }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])
  const filtered = query.trim().length > 0 ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase())) : clients
  const exactMatch = clients.find(c => c.name.toLowerCase() === query.toLowerCase())

  function startCreating() {
    setOpen(false)
    setCreating({ name: query.trim(), email: "", phone: "" })
  }

  function confirmCreate() {
    if (!creating || !creating.name.trim()) return
    onSelect({ id: "", name: creating.name.trim(), email: creating.email.trim() || undefined, phone: creating.phone.trim() || undefined })
    setQuery(creating.name.trim())
    setCreating(null)
  }

  return (
    <div ref={ref}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: "rgba(13,27,42,0.4)" }}>Cliente</p>

      {/* Mini-formulario de nuevo cliente */}
      {creating ? (
        <div className="rounded-xl p-3 space-y-2" style={{ border: `1px solid rgba(201,168,76,0.35)`, background: "rgba(201,168,76,0.04)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1" style={{ color: GOLD }}>
            <UserPlus className="w-3 h-3" /> Nuevo cliente
          </p>
          {(["name", "email", "phone"] as const).map((field) => (
            <input key={field} value={creating[field]}
              onChange={e => setCreating(f => f ? { ...f, [field]: e.target.value } : f)}
              placeholder={field === "name" ? "Nombre *" : field === "email" ? "Email (opcional)" : "Teléfono (opcional)"}
              className="w-full h-9 rounded-lg px-3 text-sm"
              style={{ border: "1px solid rgba(13,27,42,0.15)", background: "#f5f4f0", color: NAVY, outline: "none" }} />
          ))}
          <div className="flex gap-2 pt-0.5">
            <button type="button" onClick={() => { setCreating(null); onSelect(null) }}
              className="flex-1 h-8 rounded-lg text-xs font-medium"
              style={{ border: "1px solid rgba(13,27,42,0.12)", color: "rgba(13,27,42,0.45)", background: "#f5f4f0" }}>
              Cancelar
            </button>
            <button type="button" onClick={confirmCreate} disabled={!creating.name.trim()}
              className="flex-1 h-8 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(null) }}
            onFocus={() => setOpen(true)} placeholder="Buscar o dejar sin cliente…"
            className="w-full h-10 rounded-xl px-4 text-sm"
            style={{ border: BORDER, background: "#f5f4f0", color: NAVY, outline: "none" }} />
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border shadow-2xl overflow-hidden"
              style={{ border: BORDER, background: "#ffffff" }}>
              {/* Opción "sin cliente" siempre visible arriba */}
              <button type="button" onClick={() => { onSelect(null); setQuery(""); setOpen(false) }}
                className="w-full px-4 py-2.5 text-sm text-left border-b"
                style={{ color: "rgba(13,27,42,0.4)", borderColor: "rgba(13,27,42,0.06)" }}>
                Sin cliente (reserva anónima)
              </button>
              {filtered.length > 0 && (
                <div className="max-h-36 overflow-y-auto">
                  {filtered.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { onSelect({ id: c.id, name: c.name }); setQuery(c.name); setOpen(false) }}
                      className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2" style={{ color: NAVY }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: NAVY }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {query.trim() && !exactMatch && (
                <button type="button" onClick={startCreating}
                  className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 font-semibold"
                  style={{ borderTop: "1px solid rgba(201,168,76,0.12)", color: GOLD, background: "rgba(201,168,76,0.05)" }}>
                  <UserPlus className="w-4 h-4" /> Crear cliente "{query.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!creating && value && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {value.id
            ? <span className="text-[10px]" style={{ color: "rgba(13,27,42,0.4)" }}>Cliente existente</span>
            : <span className="text-[10px] flex items-center gap-1" style={{ color: GOLD }}><UserPlus className="w-3 h-3" /> Se creará al guardar</span>}
          <button type="button" onClick={() => { onSelect(null); setQuery("") }} className="text-[10px] ml-auto" style={{ color: "rgba(13,27,42,0.3)" }}>✕ quitar</button>
        </div>
      )}
    </div>
  )
}

function BookingDetail({ booking, businessId, clients, onClose, onSaved }: {
  booking: Booking
  businessId: string
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [saving, setSaving] = useState(false)
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; email?: string; phone?: string } | null>(
    booking.client ? { id: booking.clientId!, name: booking.client.name } : null
  )
  const [editForm, setEditForm] = useState({
    date: utcDate(booking.startTime, "yyyy-MM-dd"),
    startTime: utcTime(booking.startTime),
    endTime: utcTime(booking.endTime),
    notes: booking.notes || "",
  })

  async function patch(data: Record<string, unknown>) {
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/court-bookings/${booking.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    })
    setSaving(false)
    return r
  }

  const [applyScope, setApplyScope] = useState<"this" | "future" | null>(null)

  const timeChanged =
    editForm.startTime !== utcTime(booking.startTime) || editForm.endTime !== utcTime(booking.endTime)

  async function resolveEditClientId() {
    if (!selectedClient) return null
    if (selectedClient.id) return selectedClient.id
    const cr = await fetch(`/api/businesses/${businessId}/clients`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: selectedClient.name, email: selectedClient.email || null, phone: selectedClient.phone || null }),
    })
    if (cr.ok) { const cd = await cr.json(); return cd.client?.id || null }
    return null
  }

  async function handleSaveEdit(scope: "this" | "future" = "this") {
    setApplyScope(null)
    const clientId = await resolveEditClientId()

    // Siempre actualiza esta sesión
    const r = await patch({
      clientId,
      startTime: `${editForm.date}T${editForm.startTime}:00`,
      endTime: `${editForm.date}T${editForm.endTime}:00`,
      notes: editForm.notes || null,
    })
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error || "Error al guardar"); return }

    // Si aplica a futuras, llama al endpoint de grupo
    if (scope === "future" && booking.recurringGroupId && timeChanged) {
      const [sh, sm] = editForm.startTime.split(":").map(Number)
      const [eh, em] = editForm.endTime.split(":").map(Number)
      const durationMinutes = (eh * 60 + em) - (sh * 60 + sm)
      await fetch(`/api/businesses/${businessId}/recurring-bookings/${booking.recurringGroupId}/update-future`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startHour: sh, startMinute: sm, durationMinutes, fromBookingId: booking.id }),
      })
      toast.success("Sesiones futuras actualizadas")
    } else {
      toast.success("Reserva actualizada")
    }
    onSaved()
  }

  function handleSaveEditClick() {
    // Si es recurrente y cambió el horario, preguntar alcance
    if (booking.recurringGroupId && timeChanged) {
      setApplyScope("this") // abre modal
    } else {
      handleSaveEdit("this")
    }
  }

  async function handleStatus(status: string) {
    const r = await patch({ status })
    if (r.ok) { toast.success(status === "COMPLETED" ? "Reserva completada" : "Estado actualizado"); onSaved() }
    else toast.error("Error al actualizar")
  }

  const [cancelGroupModal, setCancelGroupModal] = useState(false)
  const [cancelSessions, setCancelSessions] = useState<{ id: string; startTime: string; endTime: string; price: number; status: string }[]>([])
  const [cancelSelectedIds, setCancelSelectedIds] = useState<string[]>([])
  const [cancelling, setCancelling] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [groupSessions, setGroupSessions] = useState<{ id: string; startTime: string; endTime: string; price: number; status: string }[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [paying, setPaying] = useState(false)

  async function openCancelGroupModal() {
    if (!booking.recurringGroupId) return
    const r = await fetch(`/api/businesses/${businessId}/recurring-bookings/${booking.recurringGroupId}`)
    if (r.ok) {
      const d = await r.json()
      const now = new Date()
      const future = (d.bookings as typeof cancelSessions).filter(b => new Date(b.startTime) >= now && b.status !== "CANCELLED")
      setCancelSessions(future)
      setCancelSelectedIds([])
      setCancelGroupModal(true)
    }
  }

  async function handleCancelSelected() {
    if (cancelSelectedIds.length === 0) return
    setCancelling(true)
    await Promise.all(cancelSelectedIds.map(id =>
      fetch(`/api/businesses/${businessId}/court-bookings/${id}`, { method: "DELETE" })
    ))
    setCancelling(false)
    toast.success(`${cancelSelectedIds.length} sesión${cancelSelectedIds.length !== 1 ? "es" : ""} cancelada${cancelSelectedIds.length !== 1 ? "s" : ""}`)
    setCancelGroupModal(false)
    onSaved()
  }

  async function openPayModal() {
    if (!booking.recurringGroupId) return
    const r = await fetch(`/api/businesses/${businessId}/recurring-bookings/${booking.recurringGroupId}`)
    if (r.ok) {
      const d = await r.json()
      const pending = (d.bookings as typeof groupSessions).filter(b => b.status !== "COMPLETED")
      setGroupSessions(pending)
      setSelectedIds(pending.length > 0 ? [pending[0].id] : [])
      setPayModal(true)
    }
  }

  async function handleBulkPay() {
    if (selectedIds.length === 0) return
    setPaying(true)
    const r = await fetch(`/api/businesses/${businessId}/court-bookings/bulk-complete`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingIds: selectedIds }),
    })
    setPaying(false)
    if (r.ok) {
      toast.success(`${selectedIds.length} sesión${selectedIds.length !== 1 ? "es" : ""} cobrada${selectedIds.length !== 1 ? "s" : ""}`)
      setPayModal(false)
      onSaved()
    } else toast.error("Error al cobrar")
  }

  function toggleSession(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleDelete() {
    if (!confirm("¿Cancelar esta reserva?")) return
    setSaving(true)
    await fetch(`/api/businesses/${businessId}/court-bookings/${booking.id}`, { method: "DELETE" })
    toast.success("Reserva cancelada")
    onSaved()
  }

  async function handleCancelGroup(scope: "future" | "all") {
    setSaving(true)
    await fetch(`/api/businesses/${businessId}/recurring-bookings/${booking.recurringGroupId}?scope=${scope}`, { method: "DELETE" })
    toast.success(scope === "all" ? "Todas las sesiones canceladas" : "Sesiones futuras canceladas")
    setCancelGroupModal(false)
    onSaved()
  }

  const isCancelled = booking.status === "CANCELLED"
  const isCompleted = booking.status === "COMPLETED"

  const GOLD = "#C9A84C"
  const NAVY = "#0d1b2a"
  const BORDER = "rgba(201,168,76,0.25)"
  const inputCls = "w-full h-10 rounded-xl px-3 text-sm focus:outline-none appearance-none"
  const inputStyle = { background: "#f5f4f0", border: `1px solid rgba(13,27,42,0.15)`, color: NAVY }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ border: BORDER, background: "#ffffff", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: `1px solid rgba(13,27,42,0.08)` }}>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: booking.court.color, boxShadow: `0 0 8px ${booking.court.color}` }} />
            <div>
              <p className="text-[15px] font-black uppercase tracking-wide" style={{ color: NAVY }}>{booking.court.name}</p>
              <p className="text-xs font-semibold" style={{ color: GOLD }}>{booking.court.sport || "Cancha"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide"
              style={STATUS_STYLES[booking.status] || { background: "rgba(13,27,42,0.08)", color: "rgba(13,27,42,0.4)" }}>
              {STATUS_LABELS[booking.status] || booking.status}
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ color: "rgba(13,27,42,0.3)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View mode */}
        {mode === "view" && (
          <div className="px-5 py-4 space-y-4">
            <div className="rounded-xl divide-y overflow-hidden" style={{ background: "#f5f4f0", border: "1px solid rgba(13,27,42,0.08)" }}>
              {/* Cliente con botón WhatsApp */}
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: "rgba(13,27,42,0.06)" }}>
                <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: "rgba(13,27,42,0.4)" }}>Cliente</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: NAVY }}>{booking.client?.name || "Sin cliente"}</span>
                  {booking.client?.phone && (() => {
                    const phone = booking.client.phone.replace(/\D/g, "")
                    const wa = phone.startsWith("56") ? phone : `56${phone}`
                    return (
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                        title={`WhatsApp a ${booking.client.name}`}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: "#25D366" }}>
                        <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    )
                  })()}
                </div>
              </div>
              {[
                { label: "Fecha", value: utcDate(booking.startTime, "EEEE d 'de' MMMM yyyy") },
                { label: "Horario", value: `${utcTime(booking.startTime)} – ${utcTime(booking.endTime)}` },
                { label: "Precio", value: `$${Number(booking.price).toLocaleString("es-CL")}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: "rgba(13,27,42,0.06)" }}>
                  <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: "rgba(13,27,42,0.4)" }}>{label}</span>
                  <span className="text-sm font-semibold" style={{ color: NAVY }}>{value}</span>
                </div>
              ))}
            </div>
            {booking.notes && (
              <p className="text-xs px-1 italic" style={{ color: "rgba(13,27,42,0.45)" }}>"{booking.notes}"</p>
            )}

            {/* Actions */}
            {!isCancelled && (
              <div className="space-y-3">
                {/* Acciones de esta sesión */}
                <div className="space-y-2">
                  {!isCompleted && (
                    <button onClick={() => handleStatus("COMPLETED")} disabled={saving}
                      className="w-full h-11 rounded-xl text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                      style={{ background: "rgba(201,168,76,0.15)", border: `1px solid rgba(201,168,76,0.5)`, color: "#8a6520" }}>
                      {saving ? "Guardando…" : "✓ Cobrar / Completar"}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setMode("edit")}
                      className="flex-1 h-10 rounded-xl text-sm font-semibold transition-colors"
                      style={{ background: "#f5f4f0", border: "1px solid rgba(13,27,42,0.12)", color: "rgba(13,27,42,0.6)" }}>
                      Editar
                    </button>
                    {!isCompleted && (
                      <button onClick={handleDelete} disabled={saving}
                        className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(220,38,38,0.7)" }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* Acciones de la serie recurrente */}
                {booking.recurringGroupId && (
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(13,27,42,0.08)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5" style={{ background: "#f5f4f0", color: "rgba(13,27,42,0.35)", borderBottom: "1px solid rgba(13,27,42,0.06)" }}>
                      Serie recurrente
                    </p>
                    <div className="divide-y" style={{ borderColor: "rgba(13,27,42,0.06)" }}>
                      <button onClick={openPayModal} disabled={saving}
                        className="w-full h-10 px-4 text-sm font-semibold text-left flex items-center gap-2 transition-colors disabled:opacity-50"
                        style={{ color: "#15803d", background: "rgba(34,197,94,0.04)" }}>
                        <span className="text-xs">✓✓</span> Cobrar sesiones del ciclo
                      </button>
                      <button onClick={openCancelGroupModal} disabled={saving}
                        className="w-full h-10 px-4 text-sm font-medium text-left flex items-center gap-2 transition-colors disabled:opacity-50"
                        style={{ color: "rgba(220,38,38,0.75)", background: "rgba(239,68,68,0.03)" }}>
                        <span className="text-xs">✕</span> Cancelar serie recurrente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal cobrar sesiones */}
            {payModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}
                onClick={() => setPayModal(false)}>
                <div className="w-full max-w-xs rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(34,197,94,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
                  onClick={e => e.stopPropagation()}>
                  <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(13,27,42,0.06)" }}>
                    <p className="text-sm font-black uppercase tracking-wide" style={{ color: NAVY }}>Cobrar sesiones</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>Selecciona las sesiones a marcar como cobradas</p>
                  </div>
                  {groupSessions.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-center" style={{ color: "rgba(13,27,42,0.4)" }}>Todas las sesiones ya están cobradas</p>
                  ) : (
                    <>
                      <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: "rgba(13,27,42,0.05)" }}>
                        {groupSessions.map(s => {
                          const checked = selectedIds.includes(s.id)
                          return (
                            <button key={s.id} onClick={() => toggleSession(s.id)}
                              className="w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors"
                              style={{ background: checked ? "rgba(34,197,94,0.06)" : "transparent" }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                style={{ border: checked ? "none" : "1.5px solid rgba(13,27,42,0.2)", background: checked ? "#22c55e" : "transparent" }}>
                                {checked && <span className="text-white text-[9px] font-black">✓</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold" style={{ color: NAVY }}>
                                  {utcDate(s.startTime, "EEE d MMM")} · {utcTime(s.startTime)}–{utcTime(s.endTime)}
                                </p>
                              </div>
                              <p className="text-xs font-bold flex-shrink-0" style={{ color: GOLD }}>${Number(s.price).toLocaleString("es-CL")}</p>
                            </button>
                          )
                        })}
                      </div>
                      <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid rgba(13,27,42,0.06)" }}>
                        {selectedIds.length > 0 && (
                          <div className="flex justify-between text-xs px-1">
                            <span style={{ color: "rgba(13,27,42,0.5)" }}>{selectedIds.length} sesión{selectedIds.length !== 1 ? "es" : ""}</span>
                            <span className="font-black" style={{ color: GOLD }}>
                              ${groupSessions.filter(s => selectedIds.includes(s.id)).reduce((sum, s) => sum + Number(s.price), 0).toLocaleString("es-CL")}
                            </span>
                          </div>
                        )}
                        <button onClick={handleBulkPay} disabled={paying || selectedIds.length === 0}
                          className="w-full h-10 rounded-xl text-sm font-bold uppercase tracking-wide disabled:opacity-40"
                          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.4)", color: "#15803d" }}>
                          {paying ? "Cobrando…" : `Confirmar cobro${selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}`}
                        </button>
                        <button onClick={() => setPayModal(false)}
                          className="w-full h-8 rounded-xl text-xs font-medium"
                          style={{ color: "rgba(13,27,42,0.4)", background: "#f5f4f0" }}>
                          Cancelar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Modal cancelar grupo */}
            {cancelGroupModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}
                onClick={() => setCancelGroupModal(false)}>
                <div className="w-full max-w-xs rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
                  onClick={e => e.stopPropagation()}>
                  <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(13,27,42,0.06)" }}>
                    <p className="text-sm font-black uppercase tracking-wide" style={{ color: NAVY }}>Cancelar sesiones</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>Selecciona las sesiones que quieres cancelar</p>
                  </div>
                  {cancelSessions.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-center" style={{ color: "rgba(13,27,42,0.4)" }}>No hay sesiones futuras pendientes</p>
                  ) : (
                    <>
                      <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: "rgba(13,27,42,0.05)" }}>
                        {cancelSessions.map(s => {
                          const checked = cancelSelectedIds.includes(s.id)
                          return (
                            <button key={s.id} onClick={() => setCancelSelectedIds(prev => checked ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                              className="w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors"
                              style={{ background: checked ? "rgba(239,68,68,0.05)" : "transparent" }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                                style={{ border: checked ? "none" : "1.5px solid rgba(13,27,42,0.2)", background: checked ? "#ef4444" : "transparent" }}>
                                {checked && <span className="text-white text-[9px] font-black">✕</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold" style={{ color: NAVY }}>
                                  {utcDate(s.startTime, "EEE d MMM")} · {utcTime(s.startTime)}–{utcTime(s.endTime)}
                                </p>
                              </div>
                              <p className="text-xs font-bold flex-shrink-0" style={{ color: GOLD }}>${Number(s.price).toLocaleString("es-CL")}</p>
                            </button>
                          )
                        })}
                      </div>
                      <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid rgba(13,27,42,0.06)" }}>
                        {cancelSelectedIds.length > 0 && (
                          <p className="text-xs px-1" style={{ color: "rgba(13,27,42,0.4)" }}>
                            {cancelSelectedIds.length} sesión{cancelSelectedIds.length !== 1 ? "es" : ""} seleccionada{cancelSelectedIds.length !== 1 ? "s" : ""}
                          </p>
                        )}
                        <button onClick={handleCancelSelected} disabled={cancelling || cancelSelectedIds.length === 0}
                          className="w-full h-10 rounded-xl text-sm font-bold uppercase tracking-wide disabled:opacity-40"
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", color: "rgba(220,38,38,0.85)" }}>
                          {cancelling ? "Cancelando…" : `Confirmar cancelación${cancelSelectedIds.length > 0 ? ` (${cancelSelectedIds.length})` : ""}`}
                        </button>
                        <button onClick={() => setCancelGroupModal(false)}
                          className="w-full h-8 rounded-xl text-xs font-medium"
                          style={{ color: "rgba(13,27,42,0.4)", background: "#f5f4f0" }}>
                          Volver
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit mode */}
        {mode === "edit" && (
          <div className="px-5 py-4 space-y-3">
            <ClientCombobox clients={clients} value={selectedClient} onSelect={setSelectedClient} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: "rgba(13,27,42,0.4)" }}>Fecha</p>
              <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["startTime", "endTime"] as const).map((field, i) => (
                <div key={field}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: "rgba(13,27,42,0.4)" }}>{i === 0 ? "Inicio" : "Fin"}</p>
                  <div className="relative">
                    <select value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                      className={inputCls} style={inputStyle}>
                      {TIME_SLOTS_MODAL.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(13,27,42,0.3)" }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: "rgba(13,27,42,0.4)" }}>Notas</p>
              <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Observaciones (opcional)"
                className={inputCls} style={{ ...inputStyle, color: NAVY }} />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setMode("view")}
                className="flex-1 h-10 rounded-xl text-sm transition-colors font-medium"
                style={{ border: "1px solid rgba(13,27,42,0.12)", color: "rgba(13,27,42,0.5)", background: "#f5f4f0" }}>
                Cancelar
              </button>
              <button onClick={handleSaveEditClick} disabled={saving}
                className="flex-1 h-10 rounded-xl text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                style={{ background: "rgba(201,168,76,0.12)", border: `1px solid rgba(201,168,76,0.4)`, color: "#a07b20" }}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {/* Modal: aplicar cambio de horario a sesiones futuras */}
        {applyScope !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setApplyScope(null)}>
            <div className="w-full max-w-xs rounded-2xl p-5 space-y-4" style={{ background: "#ffffff", border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
              onClick={e => e.stopPropagation()}>
              <div>
                <p className="text-sm font-black uppercase tracking-wide" style={{ color: NAVY }}>Cambio de horario</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(13,27,42,0.55)" }}>
                  Esta reserva pertenece a una serie recurrente. ¿A qué sesiones aplicas el nuevo horario?
                </p>
              </div>
              <div className="space-y-2">
                <button onClick={() => handleSaveEdit("this")} disabled={saving}
                  className="w-full h-10 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.35)`, color: "#8a6520" }}>
                  Solo esta sesión
                </button>
                <button onClick={() => handleSaveEdit("future")} disabled={saving}
                  className="w-full h-10 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: "rgba(201,168,76,0.15)", border: `1px solid rgba(201,168,76,0.5)`, color: "#7a5818" }}>
                  Esta y todas las futuras
                </button>
                <button onClick={() => setApplyScope(null)}
                  className="w-full h-9 rounded-xl text-xs font-medium"
                  style={{ color: "rgba(13,27,42,0.4)", background: "#f5f4f0" }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
