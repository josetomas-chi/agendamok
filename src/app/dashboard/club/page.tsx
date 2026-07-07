"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { Trophy, Plus, Calendar, Users, MapPin, Clock, ChevronLeft, ChevronRight, X, ChevronDown, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, subDays, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import NewBookingModal from "./_components/new-booking-modal"

type Court = { id: string; name: string; sport: string | null; color: string; isActive: boolean }
type Client = { id: string; name: string; email: string | null; phone: string | null }
type Booking = {
  id: string; courtId: string; clientId: string | null
  startTime: string; endTime: string; price: number; status: string; notes: string | null
  court: Court; client: Client | null
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

export default function ClubPage() {
  const [businessId, setBusinessId] = useState("")
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [membersCount, setMembersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"resumen" | "calendario">("calendario")
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
    fetch("/api/me/business").then(r => r.json()).then(d => {
      if (d.businessId) { setBusinessId(d.businessId); loadWeek(d.businessId); loadDay(d.businessId, new Date()) }
    })
  }, [loadWeek, loadDay])

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)" }}>
            <Trophy className="w-5 h-5" style={{ color: "#C9A84C" }} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wide" style={{ color: "#0d1b2a" }}>Club Deportivo</h1>
            <p className="text-xs font-medium" style={{ color: "rgba(13,27,42,0.45)" }}>Canchas, reservas y membresías</p>
          </div>
        </div>
        <button onClick={() => { setPreselect(null); setNewBookingOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all"
          style={{ background: "#0d1b2a", border: "1px solid #C9A84C", color: "#C9A84C" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.12)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#0d1b2a" }}>
          <Plus className="w-4 h-4" /> Nueva reserva
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)" }}>
        {(["calendario", "resumen"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wide transition-all"
            style={tab === t ? { background: "#ffffff", color: "#C9A84C", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "rgba(13,27,42,0.4)" }}>
            {t === "calendario" ? "Calendario" : "Resumen"}
          </button>
        ))}
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
                      <p className="text-sm font-semibold" style={{ color: "#0d1b2a" }}>{format(new Date(b.startTime), "HH:mm")} – {format(new Date(b.endTime), "HH:mm")}</p>
                      <p className="text-xs font-bold" style={{ color: "#C9A84C" }}>${Number(b.price).toLocaleString("es-CL")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "calendario" && (() => {
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
      customDragRef.current = null
      setDraggingId(null)
      setDragPos(null)
      setDropTarget(null)
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
    e.preventDefault()
    const durationMins = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000
    customDragRef.current = { bookingId: b.id, durationMins, sport: b.court.sport }
    setDraggingId(b.id)
    setDragLabel(b.client?.name || "Sin cliente")
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  function getBookingsForCourt(courtId: string) {
    return bookings.filter(b => b.courtId === courtId && b.status !== "CANCELLED")
  }

  function bookingStyle(b: Booking) {
    const startMins = timeToMinutes(format(new Date(b.startTime), "HH:mm"))
    const endMins = timeToMinutes(format(new Date(b.endTime), "HH:mm"))
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
        <div className="overflow-auto max-h-[calc(100vh-280px)]" ref={gridRef}>
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
                        style={{ top, height, background: "rgba(201,168,76,0.85)", borderLeft: `3px solid #C9A84C`, opacity: draggingId === b.id ? 0.35 : 1 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(0.92)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "none" }}
                      >
                        {/* Hora — absoluta esquina superior izquierda */}
                        <p className="absolute top-1 left-1.5 text-[9px] font-semibold leading-none" style={{ color: "rgba(13,27,42,0.6)" }}>
                          {format(new Date(b.startTime), "HH:mm")}–{format(new Date(b.endTime), "HH:mm")}
                        </p>
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
    date: format(new Date(booking.startTime), "yyyy-MM-dd"),
    startTime: format(new Date(booking.startTime), "HH:mm"),
    endTime: format(new Date(booking.endTime), "HH:mm"),
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

  async function handleSaveEdit() {
    let clientId: string | null = null
    if (selectedClient) {
      if (selectedClient.id) {
        clientId = selectedClient.id
      } else {
        const cr = await fetch(`/api/businesses/${businessId}/clients`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: selectedClient.name, email: selectedClient.email || null, phone: selectedClient.phone || null }),
        })
        if (cr.ok) { const cd = await cr.json(); clientId = cd.client?.id || null }
      }
    }
    const r = await patch({
      clientId,
      startTime: `${editForm.date}T${editForm.startTime}:00`,
      endTime: `${editForm.date}T${editForm.endTime}:00`,
      notes: editForm.notes || null,
    })
    if (r.ok) { toast.success("Reserva actualizada"); onSaved() }
    else { const d = await r.json().catch(() => ({})); toast.error(d.error || "Error al guardar") }
  }

  async function handleStatus(status: string) {
    const r = await patch({ status })
    if (r.ok) { toast.success(status === "COMPLETED" ? "Reserva completada" : "Estado actualizado"); onSaved() }
    else toast.error("Error al actualizar")
  }

  async function handleDelete() {
    if (!confirm("¿Cancelar esta reserva?")) return
    setSaving(true)
    await fetch(`/api/businesses/${businessId}/court-bookings/${booking.id}`, { method: "DELETE" })
    toast.success("Reserva cancelada")
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
              {[
                { label: "Cliente", value: booking.client?.name || "Sin cliente" },
                { label: "Fecha", value: format(new Date(booking.startTime), "EEEE d 'de' MMMM yyyy", { locale: es }) },
                { label: "Horario", value: `${format(new Date(booking.startTime), "HH:mm")} – ${format(new Date(booking.endTime), "HH:mm")}` },
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
              <div className="space-y-2">
                {!isCompleted && (
                  <button onClick={() => handleStatus("COMPLETED")} disabled={saving}
                    className="w-full h-10 rounded-xl text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                    style={{ background: "rgba(201,168,76,0.12)", border: `1px solid rgba(201,168,76,0.4)`, color: "#a07b20" }}>
                    {saving ? "Guardando…" : "✓ Cobrar / Completar"}
                  </button>
                )}
                <button onClick={() => setMode("edit")}
                  className="w-full h-10 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "#f5f4f0", border: "1px solid rgba(13,27,42,0.12)", color: "rgba(13,27,42,0.6)" }}>
                  Editar reserva
                </button>
                <button onClick={handleDelete} disabled={saving}
                  className="w-full h-10 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ border: "1px solid rgba(239,68,68,0.2)", color: "rgba(220,38,38,0.7)" }}>
                  Cancelar reserva
                </button>
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
              <button onClick={handleSaveEdit} disabled={saving}
                className="flex-1 h-10 rounded-xl text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50"
                style={{ background: "rgba(201,168,76,0.12)", border: `1px solid rgba(201,168,76,0.4)`, color: "#a07b20" }}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
