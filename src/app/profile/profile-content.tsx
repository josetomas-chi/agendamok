"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import {
  User, Camera, Calendar, Trophy, LogOut, Clock,
  Loader2, Medal, Star, Zap, Gift, X, AlertCircle, CreditCard, ArrowLeft,
} from "lucide-react"
import { signOut } from "next-auth/react"

type ProfileData = {
  user: { id: string; name: string | null; email: string | null; image: string | null; phone: string | null; rut: string | null }
  loyaltyPoints: number
  creditBalance: number
  totalCompleted: number
  topService: { name: string; color: string; count: number } | null
  topStaff: { name: string; count: number } | null
  activeMemberships: {
    id: string; startDate: string; endDate: string; status: string
    plan: { name: string; description: string | null }
    business: { name: string }
  }[]
  upcomingAppointments: {
    id: string; startTime: string; endTime: string; status: string
    service: { name: string; color: string; duration: number; price: number | null }
    staff: { user: { name: string | null } } | null
    business: { name: string; slug: string; cancellationHoursNotice: number | null }
  }[]
  upcomingCourtBookings: {
    id: string; startTime: string; endTime: string; price: number; status: string; paidOnline: boolean
    paidAmount: number
    court: { name: string; sport: string | null; color: string }
    business: { name: string; slug: string; cancellationHoursNotice: number | null }
  }[]
  courtBookings: {
    id: string; startTime: string; endTime: string; price: number; status: string; paidOnline: boolean
    court: { name: string; sport: string | null; color: string }
    business: { name: string; slug: string }
  }[]
  appointments: {
    id: string; startTime: string; endTime: string; status: string
    service: { name: string; color: string; duration: number; price: number | null }
    staff: { user: { name: string | null } } | null
    business: { name: string; slug: string }
  }[]
  tournaments: {
    participantId: string; participantName: string; status: string
    seed: number | null; ladderPosition: number | null; group: string | null; category: string | null
    tournament: { id: string; name: string; status: string; startDate: string | null; endDate: string | null; sport: string | null; business: { name: string } }
  }[]
  recentMatches: {
    id: string; round: number; status: string
    myScore: string | null; opponentScore: string | null; opponent: string
    result: "W" | "L" | "P"
    tournamentName: string
  }[]
}

const ACCENT  = "#38bdf8"
const BG      = "#0d1b2a"
const CARD    = "#0f2a3f"
const CARD2   = "#112233"
const BORDER  = "rgba(56,189,248,0.15)"
const BORDER2 = "rgba(255,255,255,0.07)"
const TEXT    = "#f0f6ff"
const MUTED   = "rgba(240,246,255,0.45)"

function statusLabel(s: string) {
  const map: Record<string, string> = {
    CONFIRMED: "Confirmada", PENDING: "Pendiente", CANCELLED: "Cancelada",
    COMPLETED: "Completada", NO_SHOW: "No asistió",
  }
  return map[s] ?? s
}
function statusColor(s: string) {
  if (s === "CONFIRMED") return "#22c55e"
  if (s === "COMPLETED") return "#38bdf8"
  if (s === "CANCELLED" || s === "NO_SHOW") return "#ef4444"
  return "rgba(255,255,255,0.4)"
}

function dateLabel(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Hoy"
  if (isTomorrow(d)) return "Mañana"
  const days = differenceInDays(d, new Date())
  if (days > 0 && days <= 6) return `En ${days} días`
  return format(d, "d MMM", { locale: es })
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: ACCENT }} />
      <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: ACCENT }}>
        {children}
      </h2>
    </div>
  )
}

export default function ProfileContent() {
  const router = useRouter()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set())
  const [confirmCancel, setConfirmCancel] = useState<{
    type: "court" | "appt"; id: string; paidAmount: number; paidOnline: boolean; name: string
  } | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState<{ message: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleCancel(type: "court" | "appt", id: string, refundChoice: "refund" | "credit") {
    setCancellingId(id)
    setCancelError(null)
    const res = await fetch("/api/profile/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, refundChoice }),
    })
    const json = await res.json()
    if (!res.ok) {
      setCancelError(json.error ?? "Error al cancelar")
    } else {
      setCancelledIds(prev => new Set([...prev, id]))
      const amount = json.amount ?? 0
      if (json.refundResult === "refunded" && amount > 0) {
        setCancelSuccess({ message: `Reserva cancelada. Se reembolsarán $${amount.toLocaleString("es-CL")} a tu método de pago original.` })
      } else if (json.refundResult === "credited" && amount > 0) {
        setCancelSuccess({ message: `Reserva cancelada. Se abonaron $${amount.toLocaleString("es-CL")} a tu cuenta para una próxima reserva.` })
      } else {
        setCancelSuccess({ message: "Reserva cancelada exitosamente." })
      }
    }
    setCancellingId(null)
    setConfirmCancel(null)
  }

  function canCancel(startTime: string, hoursNotice: number | null): { allowed: boolean; reason?: string } {
    if (!hoursNotice || hoursNotice === 0) return { allowed: true }
    const hoursUntil = (new Date(startTime).getTime() - Date.now()) / 3_600_000
    if (hoursUntil < hoursNotice) {
      return { allowed: false, reason: `Cancelación permitida hasta ${hoursNotice}h antes` }
    }
    return { allowed: true }
  }

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.ok ? r.json() : null)
      .then(session => {
        if (!session?.user) { router.push("/login?callbackUrl=/profile"); return }
        return fetch("/api/profile")
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setData(d) })
      })
      .catch(() => router.push("/login?callbackUrl=/profile"))
      .finally(() => setLoading(false))
  }, [router])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !data) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const r = await fetch("/api/upload", { method: "POST", body: fd })
      const { url } = await r.json()
      await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: url }) })
      setData(d => d ? { ...d, user: { ...d.user, image: url } } : d)
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
    </div>
  )
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <p className="text-sm" style={{ color: MUTED }}>Error al cargar perfil</p>
    </div>
  )

  const {
    user, loyaltyPoints, creditBalance, totalCompleted, topService, topStaff,
    activeMemberships, upcomingAppointments, upcomingCourtBookings,
    courtBookings, appointments, tournaments, recentMatches,
  } = data

  const isSportsUser = tournaments.length > 0 || upcomingCourtBookings.length > 0 || courtBookings.length > 0
  const wins = recentMatches.filter(m => m.result === "W").length
  const losses = recentMatches.filter(m => m.result === "L").length

  const allUpcoming = [
    ...upcomingAppointments.map(a => ({ ...a, type: "appt" as const, date: a.startTime })),
    ...upcomingCourtBookings.map(b => ({ ...b, type: "court" as const, date: b.startTime })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const allHistory = [
    ...courtBookings.map(b => ({ ...b, type: "court" as const, date: b.startTime })),
    ...appointments.map(a => ({ ...a, type: "appt" as const, date: a.startTime })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen pb-12" style={{ background: BG, color: TEXT }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: CARD }}>
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

        {/* Nav row */}
        <div className="relative flex items-center justify-between px-4 pt-4 pb-0">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>AgendaMok</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
            style={{ color: MUTED }}>
            <LogOut className="w-3.5 h-3.5" />Salir
          </button>
        </div>

        {/* Avatar + info */}
        <div className="relative max-w-lg mx-auto px-4 pt-5 pb-6 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="rounded-full overflow-hidden flex items-center justify-center"
              style={{ width: 86, height: 86, background: "rgba(56,189,248,0.12)", border: `3px solid ${ACCENT}` }}>
              {user.image
                ? <img src={user.image} alt="" className="w-full h-full object-cover" />
                : <User className="w-10 h-10" style={{ color: ACCENT }} />}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: ACCENT }}>
              {uploadingPhoto
                ? <Loader2 className="w-3.5 h-3.5 text-black animate-spin" />
                : <Camera className="w-3.5 h-3.5 text-black" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-black text-2xl leading-tight" style={{ color: TEXT }}>{user.name ?? "Sin nombre"}</h1>
            <p className="text-sm mt-1 truncate" style={{ color: MUTED }}>{user.email}</p>
            {user.phone && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{user.phone}</p>}
            {user.rut && (
              <span className="inline-block mt-1.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(56,189,248,0.12)", color: ACCENT }}>
                {user.rut}
              </span>
            )}
          </div>
        </div>

        {/* Bottom border with glow */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}50, transparent)` }} />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-6">

        {/* ── SPORTS: stats de partidos ── */}
        {isSportsUser && recentMatches.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Partidos", value: recentMatches.length, color: "white" },
              { label: "Victorias", value: wins, color: "#22c55e" },
              { label: "Derrotas", value: losses, color: "#ef4444" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center"
                style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: MUTED }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── GENERAL: stats de visitas + puntos + crédito ── */}
        {!isSportsUser && (totalCompleted > 0 || loyaltyPoints > 0 || creditBalance > 0) && (
          <div className="grid grid-cols-3 gap-3">
            {totalCompleted > 0 && (
              <div className="rounded-2xl p-3 text-center" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
                <p className="text-2xl font-bold" style={{ color: TEXT }}>{totalCompleted}</p>
                <p className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: MUTED }}>Visitas</p>
              </div>
            )}
            {loyaltyPoints > 0 && (
              <div className="rounded-2xl p-3 text-center" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
                <p className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{loyaltyPoints}</p>
                <p className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: MUTED }}>Puntos</p>
              </div>
            )}
            {creditBalance > 0 && (
              <div className="rounded-2xl p-3 text-center" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
                <p className="text-2xl font-bold" style={{ color: "#22c55e" }}>
                  ${(creditBalance / 100).toLocaleString("es-CL")}
                </p>
                <p className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: MUTED }}>Crédito</p>
              </div>
            )}
          </div>
        )}

        {/* ── GENERAL: servicio y profesional favorito ── */}
        {!isSportsUser && (topService || topStaff) && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>Tus favoritos</p>
            {topService && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: topService.color + "22" }}>
                  <Zap className="w-4 h-4" style={{ color: topService.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{topService.name}</p>
                  <p className="text-[11px]" style={{ color: MUTED }}>Servicio · {topService.count} visitas</p>
                </div>
                <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
              </div>
            )}
            {topStaff && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(56,189,248,0.1)" }}>
                  <User className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{topStaff.name}</p>
                  <p className="text-[11px]" style={{ color: MUTED }}>Profesional · {topStaff.count} turnos</p>
                </div>
                <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
              </div>
            )}
          </div>
        )}

        {/* ── Membresías activas ── */}
        {activeMemberships.length > 0 && (
          <section>
            <SectionTitle>Membresías activas</SectionTitle>
            <div className="space-y-2">
              {activeMemberships.map(m => {
                const daysLeft = differenceInDays(new Date(m.endDate), new Date())
                const urgent = daysLeft <= 7
                return (
                  <div key={m.id} className="rounded-2xl p-4"
                    style={{ background: CARD, border: `1px solid ${urgent ? "#f59e0b40" : BORDER}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{m.plan.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: MUTED }}>{m.business.name}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: urgent ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)",
                          color: urgent ? "#f59e0b" : "#22c55e",
                        }}>
                        {urgent ? `Vence en ${daysLeft}d` : "Activa"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Gift className="w-3 h-3" style={{ color: MUTED }} />
                      <p className="text-[11px]" style={{ color: MUTED }}>
                        Hasta el {format(new Date(m.endDate), "d 'de' MMMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Próximas reservas ── */}
        {allUpcoming.length > 0 && (
          <section>
            <SectionTitle>Próximas reservas</SectionTitle>
            {cancelError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2 text-xs"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {cancelError}
                <button onClick={() => setCancelError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <div className="space-y-2">
              {allUpcoming.filter(b => !cancelledIds.has(b.id)).map(b => {
                const hoursNotice = b.business.cancellationHoursNotice ?? null
                const { allowed, reason } = canCancel(b.startTime, hoursNotice)
                const isCancelling = cancellingId === b.id

                return (
                  <div key={b.id} className="rounded-2xl p-4"
                    style={{ background: "rgba(56,189,248,0.07)", border: `1px solid ${BORDER}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: b.type === "court" ? b.court.color : b.service.color }} />
                        <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>
                          {b.type === "court" ? b.court.name : b.service.name}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold flex-shrink-0" style={{ color: ACCENT }}>
                        {dateLabel(b.startTime)}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-[11px]" style={{ color: MUTED }}>
                      <span><Clock className="w-3 h-3 inline mr-1" />{format(new Date(b.startTime), "HH:mm")}</span>
                      <span>{b.business.name}</span>
                      {b.type === "appt" && b.staff?.user.name && <span>{b.staff.user.name}</span>}
                    </div>
                    {/* Cancel button */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {!allowed && reason && (
                          <p className="text-[10px] truncate" style={{ color: "rgba(248,113,113,0.7)" }}>
                            <AlertCircle className="w-3 h-3 inline mr-1" />{reason}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (!allowed || isCancelling) return
                          const name = b.type === "court" ? b.court.name : b.service.name
                          const paidAmount = b.type === "court" ? (Number(b.paidAmount) ?? 0) : 0
                          const paidOnline = b.type === "court" ? (b.paidOnline ?? false) : false
                          setConfirmCancel({ type: b.type, id: b.id, paidAmount, paidOnline, name })
                        }}
                        disabled={!allowed || isCancelling}
                        title={!allowed ? reason : "Cancelar reserva"}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                        style={allowed
                          ? { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }
                          : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.06)", cursor: "not-allowed" }
                        }>
                        {isCancelling && cancellingId === b.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <X className="w-3 h-3" />}
                        Cancelar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── SPORTS: torneos activos ── */}
        {isSportsUser && tournaments.filter(t => t.tournament.status !== "FINISHED").length > 0 && (
          <section>
            <SectionTitle>Torneos activos</SectionTitle>
            <div className="space-y-2">
              {tournaments.filter(t => t.tournament.status !== "FINISHED" && t.tournament.status !== "CANCELLED").map(t => (
                <div key={t.participantId} className="rounded-2xl p-4"
                  style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-snug">{t.tournament.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: MUTED }}>{t.tournament.business.name}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(56,189,248,0.12)", color: ACCENT }}>
                      {t.tournament.status === "ACTIVE" ? "En curso" : "Por iniciar"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2.5 text-[11px]" style={{ color: MUTED }}>
                    {t.category && <span><Trophy className="w-3 h-3 inline mr-1" />{t.category}</span>}
                    {t.seed && <span><Medal className="w-3 h-3 inline mr-1" />Cabeza #{t.seed}</span>}
                    {t.group && <span>Grupo {t.group}</span>}
                    {t.tournament.startDate && (
                      <span><Calendar className="w-3 h-3 inline mr-1" />
                        {format(new Date(t.tournament.startDate), "d MMM", { locale: es })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── SPORTS: últimos resultados ── */}
        {isSportsUser && recentMatches.length > 0 && (
          <section>
            <SectionTitle>Últimos resultados</SectionTitle>
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
              {recentMatches.slice(0, 5).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < 4 ? `1px solid ${BORDER}` : undefined }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                    style={{
                      background: m.result === "W" ? "rgba(34,197,94,0.15)" : m.result === "L" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                      color: m.result === "W" ? "#22c55e" : m.result === "L" ? "#ef4444" : MUTED,
                    }}>
                    {m.result === "P" ? "—" : m.result}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">vs {m.opponent}</p>
                    <p className="text-[11px] truncate" style={{ color: MUTED }}>
                      Ronda {m.round} · {m.tournamentName}
                    </p>
                  </div>
                  {m.myScore && (
                    <p className="text-sm font-mono font-bold flex-shrink-0"
                      style={{ color: m.result === "W" ? "#22c55e" : m.result === "L" ? "#ef4444" : MUTED }}>
                      {m.myScore}–{m.opponentScore}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Historial ── */}
        <section>
          <SectionTitle>Historial de reservas</SectionTitle>
          {allHistory.length === 0
            ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
                <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="text-sm" style={{ color: MUTED }}>Sin reservas aún</p>
              </div>
            )
            : (
              <div className="space-y-2">
                {allHistory.map(b => (
                  <div key={b.id} className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: b.type === "court" ? b.court.color : b.service.color }} />
                        <div className="min-w-0">
                          <p className="text-white text-sm font-semibold truncate">
                            {b.type === "court" ? b.court.name : b.service.name}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: MUTED }}>
                            {b.business.name}
                            {b.type === "appt" && b.staff?.user.name ? ` · ${b.staff.user.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: statusColor(b.status) + "20", color: statusColor(b.status) }}>
                        {statusLabel(b.status)}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-2 text-[11px]" style={{ color: MUTED }}>
                      <span><Calendar className="w-3 h-3 inline mr-1" />
                        {format(new Date(b.startTime), "d MMM yyyy", { locale: es })}
                      </span>
                      <span><Clock className="w-3 h-3 inline mr-1" />
                        {format(new Date(b.startTime), "HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>

        <div className="text-center pt-2">
          <p className="text-[10px]" style={{ color: "rgba(240,246,255,0.15)" }}>
            Reservas gestionadas por <span style={{ color: `${ACCENT}60` }}>AgendaMok</span>
          </p>
        </div>
      </div>

      {/* ── Cancel confirm modal ── */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setConfirmCancel(null)}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-5"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(239,68,68,0.12)" }}>
                <X className="w-5 h-5" style={{ color: "#f87171" }} />
              </div>
              <div>
                <p className="font-black text-sm" style={{ color: TEXT }}>Cancelar reserva</p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>{confirmCancel.name}</p>
              </div>
            </div>

            {/* Refund options — only when there's a paid amount */}
            {confirmCancel.paidAmount > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold" style={{ color: MUTED }}>
                  Monto pagado: <span className="font-black" style={{ color: TEXT }}>
                    ${confirmCancel.paidAmount.toLocaleString("es-CL")}
                  </span> — ¿cómo quieres recuperarlo?
                </p>

                {/* Refund to original method */}
                {confirmCancel.paidOnline && (
                  <button
                    onClick={() => handleCancel(confirmCancel.type, confirmCancel.id, "refund")}
                    disabled={!!cancellingId}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                    style={{ background: "rgba(56,189,248,0.08)", border: `1px solid ${BORDER}` }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(56,189,248,0.15)" }}>
                      {cancellingId === confirmCancel.id
                        ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: ACCENT }} />
                        : <CreditCard className="w-4 h-4" style={{ color: ACCENT }} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: TEXT }}>Reembolso automático</p>
                      <p className="text-[11px]" style={{ color: MUTED }}>De vuelta a tu método de pago original</p>
                    </div>
                  </button>
                )}

                {/* Credit to account */}
                <button
                  onClick={() => handleCancel(confirmCancel.type, confirmCancel.id, "credit")}
                  disabled={!!cancellingId}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                  style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(34,197,94,0.12)" }}>
                    {cancellingId === confirmCancel.id
                      ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#22c55e" }} />
                      : <Gift className="w-4 h-4" style={{ color: "#22c55e" }} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: TEXT }}>Abonar a mi cuenta</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>Crédito para tu próxima reserva</p>
                  </div>
                </button>
              </div>
            ) : (
              /* No payment — just confirm cancellation */
              <div className="space-y-3">
                <p className="text-sm" style={{ color: MUTED }}>¿Confirmas la cancelación de esta reserva?</p>
                <button
                  onClick={() => handleCancel(confirmCancel.type, confirmCancel.id, "refund")}
                  disabled={!!cancellingId}
                  className="w-full h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                  {cancellingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Confirmar cancelación
                </button>
              </div>
            )}

            {cancelError && (
              <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
                {cancelError}
              </p>
            )}

            <button onClick={() => { setConfirmCancel(null); setCancelError(null) }}
              className="w-full flex items-center justify-center gap-1.5 text-xs py-2"
              style={{ color: MUTED }}>
              <ArrowLeft className="w-3.5 h-3.5" />Volver
            </button>
          </div>
        </div>
      )}

      {/* ── Success toast ── */}
      {cancelSuccess && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl max-w-sm w-full"
            style={{ background: "#0f2a3f", border: `1px solid rgba(34,197,94,0.4)` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(34,197,94,0.15)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-xs font-semibold flex-1" style={{ color: TEXT }}>{cancelSuccess.message}</p>
            <button onClick={() => setCancelSuccess(null)}><X className="w-4 h-4" style={{ color: MUTED }} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
