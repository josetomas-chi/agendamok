"use client"
import React, { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Calendar, Users, DollarSign, Clock, Phone, CheckCircle, Circle, LogOut } from "lucide-react"
import { format, addDays, startOfWeek, endOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { signOut } from "next-auth/react"
import { utcToChileLocal } from "@/lib/timezone"

const ACCENT = "#38bdf8"
const BG = "#1c1c1e"
const CARD = "#2c2c30"
const CARD2 = "#3a3a3c"

type Coach = {
  id: string
  name: string
  color: string
  paymentType: string
  commissionPercent: number | null
  business: { id: string; name: string; logo: string | null }
}

type Booking = {
  id: string
  startTime: string
  endTime: string
  status: string
  price: number
  paidAmount: number
  coachPaid: boolean
  client: { id: string; name: string; lastName: string; phone: string | null } | null
  court: { id: string; name: string; color: string; sport: string | null }
}

type SchoolClass = {
  id: string
  scheduledAt: string
  durationMinutes: number
  attendance: { id: string; enrollmentId: string; present: boolean }[]
}

type Enrollment = {
  id: string
  client: { id: string; name: string; lastName: string; phone: string | null }
}

type SchoolGroup = {
  id: string
  name: string
  sport: string | null
  classes: SchoolClass[]
  enrollments: Enrollment[]
}

type TabType = "agenda" | "escuela" | "ganancias"

export default function CoachPortalClient({ coach }: { coach: Coach }) {
  const [tab, setTab] = useState<TabType>("agenda")
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [bookings, setBookings] = useState<Booking[]>([])
  const [schoolGroups, setSchoolGroups] = useState<SchoolGroup[]>([])
  const [earnings, setEarnings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<SchoolGroup | null>(null)
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null)

  const weekEnd = addDays(weekStart, 7)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/coach/me?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`)
      if (!r.ok) return
      const d = await r.json()
      setBookings(d.bookings)
      setSchoolGroups(d.schoolGroups)
      setEarnings(d.earnings)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { load() }, [load])

  async function toggleAttendance(classId: string, enrollmentId: string, present: boolean) {
    setSavingAttendance(enrollmentId)
    try {
      const r = await fetch(`/api/businesses/${coach.business.id}/school/classes/${classId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, present }),
      })
      if (r.ok) {
        setSelectedClass(prev => {
          if (!prev) return prev
          const existing = prev.attendance.find(a => a.enrollmentId === enrollmentId)
          const updated = existing
            ? prev.attendance.map(a => a.enrollmentId === enrollmentId ? { ...a, present } : a)
            : [...prev.attendance, { id: "", enrollmentId, present }]
          return { ...prev, attendance: updated }
        })
        // Update in schoolGroups too
        setSchoolGroups(prev => prev.map(g => ({
          ...g,
          classes: g.classes.map(c => {
            if (c.id !== classId) return c
            const existing = c.attendance.find(a => a.enrollmentId === enrollmentId)
            const updated = existing
              ? c.attendance.map(a => a.enrollmentId === enrollmentId ? { ...a, present } : a)
              : [...c.attendance, { id: "", enrollmentId, present }]
            return { ...c, attendance: updated }
          })
        })))
      } else toast.error("Error al guardar asistencia")
    } finally {
      setSavingAttendance(null)
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  const bookingsByDay = days.map(day => ({
    day,
    items: bookings.filter(b => {
      const d = utcToChileLocal(new Date(b.startTime))
      return d.toDateString() === day.toDateString()
    })
  }))

  const totalClasses = schoolGroups.reduce((s, g) => s + g.classes.length, 0)

  return (
    <div className="min-h-screen" style={{ background: BG, color: "white" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid rgba(255,255,255,0.08)` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: coach.color }}>
            {coach.name[0]}
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{coach.name}</p>
            <p className="text-[11px] opacity-50 mt-0.5">{coach.business.name}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="opacity-40 hover:opacity-70 transition-opacity">
          <LogOut size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.08)", background: CARD }}>
        {([["agenda", "Agenda", Calendar], ["escuela", "Escuela", Users], ["ganancias", "Ganancias", DollarSign]] as [TabType, string, React.ElementType][]).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors"
            style={{ color: tab === id ? ACCENT : "rgba(255,255,255,0.4)", borderBottom: tab === id ? `2px solid ${ACCENT}` : "2px solid transparent" }}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">
        {/* Week navigator */}
        {(tab === "agenda" || tab === "escuela") && (
          <div className="flex items-center justify-between py-3">
            <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-1.5 rounded-lg" style={{ background: CARD2 }}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium opacity-70">
              {format(weekStart, "d MMM", { locale: es })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
            </span>
            <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-1.5 rounded-lg" style={{ background: CARD2 }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* AGENDA TAB */}
        {tab === "agenda" && (
          <div className="space-y-3 mt-1">
            {loading ? (
              <p className="text-center opacity-40 py-10 text-sm">Cargando...</p>
            ) : bookingsByDay.every(d => d.items.length === 0) ? (
              <p className="text-center opacity-40 py-10 text-sm">Sin clases esta semana</p>
            ) : bookingsByDay.filter(d => d.items.length > 0).map(({ day, items }) => (
              <div key={day.toISOString()}>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-50 mb-2">
                  {format(day, "EEEE d", { locale: es })}
                  {day.toDateString() === today.toDateString() && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px]" style={{ background: ACCENT, color: "#000" }}>Hoy</span>}
                </p>
                <div className="space-y-2">
                  {items.map(b => {
                    const start = utcToChileLocal(new Date(b.startTime))
                    const end = utcToChileLocal(new Date(b.endTime))
                    const isPaid = Number(b.paidAmount) >= Number(b.price) && Number(b.price) > 0
                    return (
                      <div key={b.id} className="rounded-xl p-3 flex gap-3" style={{ background: CARD }}>
                        <div className="w-1 rounded-full flex-shrink-0" style={{ background: b.court.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold leading-tight">
                                {b.client ? `${b.client.name} ${b.client.lastName}` : "Sin cliente"}
                              </p>
                              <p className="text-[11px] opacity-50">{b.court.name}{b.court.sport ? ` · ${b.court.sport}` : ""}</p>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{
                              background: b.status === "COMPLETED" ? "rgba(34,197,94,0.2)" : "rgba(251,146,60,0.2)",
                              color: b.status === "COMPLETED" ? "#4ade80" : "#fb923c"
                            }}>{b.status === "COMPLETED" ? "Completada" : "Confirmada"}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-[11px] opacity-60">
                              <Clock size={11} />
                              {format(start, "HH:mm")} – {format(end, "HH:mm")}
                            </span>
                            {Number(b.price) > 0 && (
                              <span className="flex items-center gap-1 text-[11px]" style={{ color: isPaid ? "#4ade80" : "#fb923c" }}>
                                <DollarSign size={11} />
                                ${Number(b.price).toLocaleString("es-CL")} {isPaid ? "· Pagado" : "· Pendiente"}
                              </span>
                            )}
                          </div>
                          {b.client?.phone && (
                            <a href={`tel:${b.client.phone}`} className="flex items-center gap-1 mt-1.5 text-[11px]" style={{ color: ACCENT }}>
                              <Phone size={11} /> {b.client.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ESCUELA TAB */}
        {tab === "escuela" && (
          <div className="space-y-3 mt-1">
            {loading ? (
              <p className="text-center opacity-40 py-10 text-sm">Cargando...</p>
            ) : schoolGroups.length === 0 ? (
              <p className="text-center opacity-40 py-10 text-sm">Sin grupos asignados</p>
            ) : schoolGroups.map(group => {
              const weekClasses = group.classes
              return (
                <div key={group.id} className="rounded-xl overflow-hidden" style={{ background: CARD }}>
                  <div className="px-4 py-3 flex items-center justify-between cursor-pointer"
                    onClick={() => setSelectedGroup(selectedGroup?.id === group.id ? null : group)}>
                    <div>
                      <p className="text-sm font-semibold">{group.name}</p>
                      <p className="text-[11px] opacity-50">{group.enrollments.length} alumnos{group.sport ? ` · ${group.sport}` : ""}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(56,189,248,0.15)", color: ACCENT }}>
                      {weekClasses.length} clase{weekClasses.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {selectedGroup?.id === group.id && (
                    <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)` }}>
                      {/* Classes this week */}
                      {weekClasses.length > 0 && (
                        <div className="px-4 py-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-40 mb-2">Clases esta semana</p>
                          {weekClasses.map(cls => {
                            const dt = utcToChileLocal(new Date(cls.scheduledAt))
                            const presentCount = cls.attendance.filter(a => a.present).length
                            return (
                              <div key={cls.id} className="rounded-lg p-3 cursor-pointer" style={{ background: CARD2 }}
                                onClick={() => setSelectedClass(selectedClass?.id === cls.id ? null : cls)}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">{format(dt, "EEEE d", { locale: es })} · {format(dt, "HH:mm")}</p>
                                    <p className="text-[11px] opacity-50">{cls.durationMinutes} min</p>
                                  </div>
                                  <span className="text-[11px] opacity-60">{presentCount}/{group.enrollments.length} presentes</span>
                                </div>

                                {/* Attendance list */}
                                {selectedClass?.id === cls.id && (
                                  <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-40">Asistencia</p>
                                    {group.enrollments.map(enr => {
                                      const att = cls.attendance.find(a => a.enrollmentId === enr.id)
                                      const present = att?.present ?? false
                                      return (
                                        <div key={enr.id} className="flex items-center justify-between py-1">
                                          <div>
                                            <p className="text-sm">{enr.client.name} {enr.client.lastName}</p>
                                            {enr.client.phone && <p className="text-[11px] opacity-40">{enr.client.phone}</p>}
                                          </div>
                                          <button
                                            disabled={savingAttendance === enr.id}
                                            onClick={() => toggleAttendance(cls.id, enr.id, !present)}
                                            style={{ color: present ? "#4ade80" : "rgba(255,255,255,0.3)" }}>
                                            {present ? <CheckCircle size={22} /> : <Circle size={22} />}
                                          </button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Alumnos list */}
                      <div className="px-4 py-3" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-40 mb-2">Alumnos activos</p>
                        <div className="space-y-2">
                          {group.enrollments.map(enr => (
                            <div key={enr.id} className="flex items-center justify-between">
                              <p className="text-sm">{enr.client.name} {enr.client.lastName}</p>
                              {enr.client.phone && (
                                <a href={`tel:${enr.client.phone}`} style={{ color: ACCENT }} className="text-[11px] flex items-center gap-1">
                                  <Phone size={11} /> {enr.client.phone}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* GANANCIAS TAB */}
        {tab === "ganancias" && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl p-5 text-center" style={{ background: CARD }}>
              <p className="text-[11px] opacity-50 uppercase tracking-wider mb-1">Esta semana</p>
              <p className="text-4xl font-bold" style={{ color: ACCENT }}>${earnings.toLocaleString("es-CL")}</p>
              <p className="text-[11px] opacity-40 mt-1">
                {coach.paymentType === "COMMISSION" ? `${coach.commissionPercent}% comisión` : "Tarifa por clase"}
              </p>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ background: CARD }}>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                <p className="text-sm font-semibold">Clases completadas</p>
              </div>
              {bookings.filter(b => b.status === "COMPLETED").length === 0 ? (
                <p className="text-center opacity-40 py-6 text-sm">Sin clases completadas esta semana</p>
              ) : bookings.filter(b => b.status === "COMPLETED").map(b => {
                const start = utcToChileLocal(new Date(b.startTime))
                let coachEarning = 0
                if (coach.paymentType === "COMMISSION" && coach.commissionPercent) {
                  coachEarning = Number(b.price) * (coach.commissionPercent / 100)
                } else if (coach.paymentType === "COURT_FEE") {
                  coachEarning = Number(b.price)
                }
                return (
                  <div key={b.id} className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <div>
                      <p className="text-sm">{b.client ? `${b.client.name} ${b.client.lastName}` : "Sin cliente"}</p>
                      <p className="text-[11px] opacity-50">{format(start, "EEE d MMM HH:mm", { locale: es })} · {b.court.name}</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: ACCENT }}>${coachEarning.toLocaleString("es-CL")}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
