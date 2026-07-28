"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { format, isPast } from "date-fns"
import { es } from "date-fns/locale"
import {
  User, Camera, Calendar, Trophy, LogOut, ChevronRight,
  MapPin, Clock, CheckCircle2, XCircle, Loader2, Medal,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"

// ─── types ────────────────────────────────────────────────────────────────────
type ProfileData = {
  user: { id: string; name: string | null; email: string | null; image: string | null; phone: string | null; rut: string | null }
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

const ACCENT = "#38bdf8"
const BG = "#0f0f11"
const CARD = "#1c1c20"
const BORDER = "rgba(255,255,255,0.07)"

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

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login?callbackUrl=/profile"); return }
    if (status !== "authenticated") return
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [status, router])

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

  if (loading || status === "loading") return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: ACCENT }} />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <p className="text-white/40 text-sm">Error al cargar perfil</p>
    </div>
  )

  const { user, courtBookings, appointments, tournaments, recentMatches } = data

  // Merge and sort all bookings
  const allBookings = [
    ...courtBookings.map(b => ({ ...b, type: "court" as const, date: b.startTime })),
    ...appointments.map(a => ({ ...a, type: "appt" as const, date: a.startTime })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const activeTournaments = tournaments.filter(t => t.tournament.status !== "FINISHED" && t.tournament.status !== "CANCELLED")
  const wins = recentMatches.filter(m => m.result === "W").length
  const losses = recentMatches.filter(m => m.result === "L").length

  return (
    <div className="min-h-screen pb-12" style={{ background: BG }}>
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14" style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
        <span className="font-bold text-white text-base">Mi perfil</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Salir
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Avatar + nombre */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "rgba(56,189,248,0.1)", border: `2px solid ${ACCENT}30` }}>
              {user.image
                ? <img src={user.image} alt="" className="w-full h-full object-cover" />
                : <User className="w-9 h-9" style={{ color: ACCENT }} />}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
              style={{ background: ACCENT }}>
              {uploadingPhoto
                ? <Loader2 className="w-3.5 h-3.5 text-black animate-spin" />
                : <Camera className="w-3.5 h-3.5 text-black" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight truncate">{user.name ?? "Sin nombre"}</h1>
            <p className="text-sm mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{user.email}</p>
            {user.phone && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{user.phone}</p>}
            {user.rut && <p className="text-xs mt-0.5 font-mono" style={{ color: ACCENT + "99" }}>{user.rut}</p>}
          </div>
        </div>

        {/* Stats */}
        {recentMatches.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Partidos", value: recentMatches.length },
              { label: "Victorias", value: wins, color: "#22c55e" },
              { label: "Derrotas", value: losses, color: "#ef4444" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <p className="text-2xl font-bold" style={{ color: s.color ?? "white" }}>{s.value}</p>
                <p className="text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Torneos activos */}
        {activeTournaments.length > 0 && (
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: ACCENT }}>
              Torneos activos
            </h2>
            <div className="space-y-2">
              {activeTournaments.map(t => (
                <div key={t.participantId} className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm leading-snug">{t.tournament.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{t.tournament.business.name}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(56,189,248,0.12)", color: ACCENT }}>
                      {t.tournament.status === "ACTIVE" ? "En curso" : "Por iniciar"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2.5">
                    {t.category && (
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        <Trophy className="w-3 h-3 inline mr-1" />{t.category}
                      </span>
                    )}
                    {t.seed && (
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        <Medal className="w-3 h-3 inline mr-1" />Cabeza #{t.seed}
                      </span>
                    )}
                    {t.group && (
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Grupo {t.group}
                      </span>
                    )}
                    {t.tournament.startDate && (
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {format(new Date(t.tournament.startDate), "d MMM", { locale: es })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Últimos resultados */}
        {recentMatches.length > 0 && (
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: ACCENT }}>
              Últimos resultados
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {recentMatches.slice(0, 5).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < Math.min(recentMatches.length, 5) - 1 ? `1px solid ${BORDER}` : undefined }}>
                  {/* Result badge */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                    style={{
                      background: m.result === "W" ? "rgba(34,197,94,0.15)" : m.result === "L" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                      color: m.result === "W" ? "#22c55e" : m.result === "L" ? "#ef4444" : "rgba(255,255,255,0.4)",
                    }}>
                    {m.result === "P" ? "—" : m.result}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">vs {m.opponent}</p>
                    <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Ronda {m.round} · {m.tournamentName}
                    </p>
                  </div>
                  {m.myScore && (
                    <p className="text-sm font-mono font-bold flex-shrink-0"
                      style={{ color: m.result === "W" ? "#22c55e" : m.result === "L" ? "#ef4444" : "rgba(255,255,255,0.5)" }}>
                      {m.myScore}–{m.opponentScore}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Historial de reservas */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: ACCENT }}>
            Historial de reservas
          </h2>
          {allBookings.length === 0
            ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.15)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Sin reservas aún</p>
              </div>
            )
            : (
              <div className="space-y-2">
                {allBookings.map(b => {
                  const past = isPast(new Date(b.date))
                  if (b.type === "court") {
                    return (
                      <div key={b.id} className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.court.color }} />
                              <p className="text-white text-sm font-semibold truncate">{b.court.name}</p>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{b.business.name}</p>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: statusColor(b.status) + "20", color: statusColor(b.status) }}>
                            {statusLabel(b.status)}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-2.5 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                          <span><Calendar className="w-3 h-3 inline mr-1" />{format(new Date(b.startTime), "d MMM yyyy", { locale: es })}</span>
                          <span><Clock className="w-3 h-3 inline mr-1" />{format(new Date(b.startTime), "HH:mm")}</span>
                          {b.court.sport && <span><MapPin className="w-3 h-3 inline mr-1" />{b.court.sport}</span>}
                        </div>
                      </div>
                    )
                  }
                  // appointment
                  return (
                    <div key={b.id} className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.service.color }} />
                            <p className="text-white text-sm font-semibold truncate">{b.service.name}</p>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {b.business.name}{b.staff?.user.name ? ` · ${b.staff.user.name}` : ""}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: statusColor(b.status) + "20", color: statusColor(b.status) }}>
                          {statusLabel(b.status)}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-2.5 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        <span><Calendar className="w-3 h-3 inline mr-1" />{format(new Date(b.startTime), "d MMM yyyy", { locale: es })}</span>
                        <span><Clock className="w-3 h-3 inline mr-1" />{format(new Date(b.startTime), "HH:mm")}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </section>

        {/* Branding */}
        <div className="text-center pt-2">
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>
            Reservas gestionadas por{" "}
            <span style={{ color: ACCENT + "80" }}>AgendaMok</span>
          </p>
        </div>
      </div>
    </div>
  )
}
