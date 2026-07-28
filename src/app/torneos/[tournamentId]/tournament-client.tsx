"use client"
import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  Trophy, Calendar, Users, Tag, ChevronRight, Loader2, Plus, X,
  Clock, MapPin, ChevronLeft,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// ── Design tokens (AgendaMok Sports) ────────────────────────────────
const BG      = "#0d1b2a"
const CARD    = "#0f2a3f"
const CARD2   = "#112233"
const ACCENT  = "#38bdf8"
const BORDER  = "rgba(56,189,248,0.15)"
const BORDER2 = "rgba(255,255,255,0.07)"
const TEXT    = "#f0f6ff"
const MUTED   = "rgba(240,246,255,0.45)"
const FAINT   = "rgba(240,246,255,0.18)"

// ── Labels ───────────────────────────────────────────────────────────
const FORMAT_LABELS: Record<string,string> = {
  ELIMINATION: "Eliminación directa",
  ROUND_ROBIN: "Liga",
  GROUP_STAGE: "Fase de grupos",
}
const TYPE_LABELS: Record<string,string> = {
  INDIVIDUAL: "Individual", PAIR: "Parejas", TEAM: "Equipos",
}
const STATUS_LABEL: Record<string,string> = {
  OPEN: "Inscripciones abiertas", IN_PROGRESS: "En juego", FINISHED: "Finalizado",
}
const STATUS_DOT: Record<string,string> = {
  OPEN: "#22c55e", IN_PROGRESS: "#38bdf8", FINISHED: MUTED,
}

// ── Helpers ──────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}
function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, "").toUpperCase()
  if (clean.length < 2) return clean
  return `${clean.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${clean.slice(-1)}`
}
function pName(p: { name: string; players: unknown }, type: string): string {
  if (type !== "PAIR") return p.name
  const pl = p.players as { name: string }[]
  return pl?.length >= 2 ? `${pl[0].name} / ${pl[1].name}` : p.name
}
function initials(name: string) {
  return name.split(/[\s/]+/).slice(0,2).map(w => w[0]?.toUpperCase() ?? "").join("")
}

// ── Types ────────────────────────────────────────────────────────────
type Category   = { id: string; name: string; description: string | null }
type ScheduleDay = { id: string; date: string; startTime: string; endTime: string; sortOrder: number; allowRestrictions: boolean }
type Tournament = {
  id: string; name: string; sport: string | null; format: string; participantType: string
  startDate: string; endDate: string; maxParticipants: number | null; entryFee: string | null
  status: string; description: string | null; categories: Category[]; registeredCount: number
  business: { name: string; logoUrl: string | null }; paymentEnabled: boolean
  flyer: string | null; registrationDeadline: string | null
  scheduleDays: ScheduleDay[]; allowScheduleRestrictions: boolean; maxRestrictionsPerParticipant: number
}
type StandingRow = {
  id: string; name: string; players: unknown; seed: number | null
  played: number; wins: number; losses: number; setsW: number; setsL: number; gamesW: number; gamesL: number; pts: number
}
type MatchParticipant = { id: string; name: string; players: unknown } | null
type Match = {
  id: string; round: number; matchNumber: number; status: string; stage: string
  group: string | null; categoryId: string | null; scheduledTime: string | null
  courtNumber: number | null; sets: unknown; score1: string | null; score2: string | null
  participant1Id: string | null; participant2Id: string | null; winnerId: string | null
  participant1: MatchParticipant; participant2: MatchParticipant
  winner: { id: string; name: string } | null
}
type Restriction = { date: string; time: string }

// ── Avatar chip ──────────────────────────────────────────────────────
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{ width: size, height: size, background: "rgba(56,189,248,0.15)", color: ACCENT, fontSize: size * 0.35, border: `1px solid ${BORDER}` }}>
      {initials(name)}
    </div>
  )
}

// ── Schedule restrictions modal ──────────────────────────────────────
function buildHourlySlots(s: string, e: string) {
  const slots: string[] = []
  const [sh] = s.split(":").map(Number); const [eh] = e.split(":").map(Number)
  for (let h = sh; h < eh; h++) slots.push(`${String(h).padStart(2,"0")}:00`)
  return slots
}
function fmtDay(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("es-CL",{weekday:"short",day:"numeric",month:"short",year:"numeric"})
}

function RestrictionsModal({ scheduleDays, maxRestrictions, restrictions, onChange, onClose }:{
  scheduleDays: ScheduleDay[]; maxRestrictions: number; restrictions: Restriction[]
  onChange: (r: Restriction[]) => void; onClose: () => void
}) {
  const toggle = (date: string, time: string) => {
    const key = `${date}|${time}`
    const exists = restrictions.some(r => `${r.date}|${r.time}` === key)
    if (exists) onChange(restrictions.filter(r => `${r.date}|${r.time}` !== key))
    else {
      if (maxRestrictions > 0 && restrictions.length >= maxRestrictions) return
      onChange([...restrictions, { date, time }])
    }
  }
  const isBlocked = (date: string, time: string) => restrictions.some(r => r.date === date && r.time === time)
  const remaining = maxRestrictions > 0 ? maxRestrictions - restrictions.length : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: BG }}>
      <div className="flex items-center justify-between px-4 py-3.5"
        style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ color: MUTED }}>
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-white">Mis horarios bloqueados</p>
          {remaining !== null && (
            <p className="text-[10px]" style={{ color: MUTED }}>
              {remaining > 0 ? `${remaining} bloqueo${remaining !== 1?"s":""} disponible${remaining !== 1?"s":""}` : "Límite alcanzado"}
            </p>
          )}
        </div>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "rgba(56,189,248,0.15)", color: ACCENT }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {scheduleDays.map(day => {
          const slots = buildHourlySlots(day.startTime, day.endTime)
          return (
            <div key={day.id}>
              <div className="px-4 py-2.5 sticky top-0 z-10" style={{ background: day.allowRestrictions ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.02)" }}>
                <p className="text-xs font-bold" style={{ color: day.allowRestrictions ? TEXT : FAINT }}>
                  {fmtDay(day.date)}
                  {!day.allowRestrictions && <span className="ml-2 text-[10px]" style={{ color: FAINT }}>(No seleccionable)</span>}
                </p>
              </div>
              {slots.map(time => {
                const blocked = isBlocked(day.date, time)
                const canBlock = day.allowRestrictions && (remaining === null || remaining > 0 || blocked)
                return (
                  <button key={time} type="button" disabled={!canBlock} onClick={() => canBlock && toggle(day.date, time)}
                    className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                    style={{ background: blocked ? "rgba(239,68,68,0.08)" : "transparent", borderBottom: `1px solid ${BORDER2}`, cursor: canBlock ? "pointer" : "default", opacity: !day.allowRestrictions ? 0.35 : 1 }}>
                    <span className="text-sm font-medium" style={{ color: blocked ? "#f87171" : MUTED }}>{time}</span>
                    {blocked && (
                      <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)", border: "1.5px solid #f87171" }}>
                        <X className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Standing table ───────────────────────────────────────────────────
function StandingsTable({ rows, participantType }: { rows: StandingRow[]; participantType: string }) {
  if (rows.length === 0) return (
    <div className="text-center py-16">
      <Trophy className="w-10 h-10 mx-auto mb-3 opacity-10" style={{ color: TEXT }} />
      <p className="text-sm" style={{ color: MUTED }}>Sin partidos finalizados aún</p>
    </div>
  )

  const cols = ["PJ","PG","PP","SG","SP","JG","JP","PTS"] as const
  const colTips: Record<string,string> = { PJ:"Partidos jugados", PG:"Ganados", PP:"Perdidos", SG:"Sets ganados", SP:"Sets perdidos", JG:"Juegos ganados", JP:"Juegos perdidos", PTS:"Puntos (PG×3)" }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
        {cols.map(c => (
          <span key={c} className="text-[10px]" style={{ color: FAINT }}>
            <span className="font-bold" style={{ color: MUTED }}>{c}</span> {colTips[c]}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div className="grid items-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ gridTemplateColumns: "2rem 1fr repeat(8, 2.6rem)", background: "rgba(56,189,248,0.06)", borderBottom: `1px solid ${BORDER}`, color: MUTED }}>
          <span className="text-center">#</span>
          <span>Equipo</span>
          {cols.map(c => <span key={c} className="text-center" style={{ color: c === "PTS" ? ACCENT : MUTED }}>{c}</span>)}
        </div>

        {rows.map((r, i) => {
          const isFirst = i === 0
          const diff = r.gamesW - r.gamesL
          return (
            <div key={r.id} className="grid items-center px-3 py-3"
              style={{
                gridTemplateColumns: "2rem 1fr repeat(8, 2.6rem)",
                borderBottom: i < rows.length - 1 ? `1px solid ${BORDER2}` : undefined,
                background: isFirst ? "rgba(56,189,248,0.04)" : undefined,
              }}>
              {/* Position */}
              <div className="flex items-center justify-center">
                {i < 3 ? (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: i===0?"rgba(250,204,21,0.2)":i===1?"rgba(148,163,184,0.15)":"rgba(205,127,50,0.15)",
                      color:      i===0?"#facc15":i===1?"#94a3b8":"#cd7f32",
                    }}>
                    {i+1}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-center w-full" style={{ color: FAINT }}>{i+1}</span>
                )}
              </div>

              {/* Name */}
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={pName(r, participantType)} size={26} />
                <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>
                  {pName(r, participantType)}
                </p>
              </div>

              <span className="text-xs text-center font-medium" style={{ color: MUTED }}>{r.played}</span>
              <span className="text-xs text-center font-bold" style={{ color: r.wins > 0 ? "#22c55e" : FAINT }}>{r.wins}</span>
              <span className="text-xs text-center font-medium" style={{ color: r.losses > 0 ? "#f87171" : FAINT }}>{r.losses}</span>
              <span className="text-xs text-center" style={{ color: TEXT }}>{r.setsW}</span>
              <span className="text-xs text-center" style={{ color: MUTED }}>{r.setsL}</span>
              <span className="text-xs text-center" style={{ color: TEXT }}>{r.gamesW}</span>
              <span className="text-xs text-center" style={{ color: MUTED }}>{r.gamesL}</span>
              <span className="text-xs text-center font-black" style={{ color: ACCENT }}>{r.pts}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Matches list ─────────────────────────────────────────────────────
function MatchesList({ matches, participantType }: { matches: Match[]; participantType: string }) {
  const byRound = matches.reduce<Record<number, Match[]>>((acc, m) => {
    if (!acc[m.round]) acc[m.round] = []
    acc[m.round].push(m)
    return acc
  }, {})
  const rounds = Object.keys(byRound).map(Number).sort((a,b) => a-b)

  if (rounds.length === 0) return (
    <div className="text-center py-16">
      <Calendar className="w-10 h-10 mx-auto mb-3 opacity-10" style={{ color: TEXT }} />
      <p className="text-sm" style={{ color: MUTED }}>Sin partidos programados aún</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {rounds.map(round => (
        <div key={round}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5 px-1" style={{ color: ACCENT }}>
            Ronda {round}
          </p>
          <div className="space-y-2">
            {byRound[round].map(m => {
              const p1Name = m.participant1 ? pName(m.participant1, participantType) : "TBD"
              const p2Name = m.participant2 ? pName(m.participant2, participantType) : "TBD"
              const finished = m.status === "FINISHED"
              const p1Won = finished && m.winnerId === m.participant1Id
              const p2Won = finished && m.winnerId === m.participant2Id

              const sets = Array.isArray(m.sets) ? m.sets as { s1: number; s2: number }[] : null

              return (
                <div key={m.id} className="rounded-2xl p-4"
                  style={{ background: CARD, border: `1px solid ${finished ? BORDER : BORDER2}` }}>
                  {/* Status + meta */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: finished ? "rgba(56,189,248,0.12)" : m.status === "IN_PROGRESS" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
                        color: finished ? ACCENT : m.status === "IN_PROGRESS" ? "#22c55e" : FAINT,
                      }}>
                      {finished ? "Finalizado" : m.status === "IN_PROGRESS" ? "En juego" : "Pendiente"}
                    </span>
                    {m.scheduledTime && (
                      <span className="text-[10px] flex items-center gap-1" style={{ color: MUTED }}>
                        <Clock className="w-3 h-3" />
                        {format(new Date(m.scheduledTime), "d MMM · HH:mm", { locale: es })}
                      </span>
                    )}
                    {m.courtNumber && (
                      <span className="text-[10px] flex items-center gap-1" style={{ color: MUTED }}>
                        <MapPin className="w-3 h-3" />Cancha {m.courtNumber}
                      </span>
                    )}
                    {m.group && (
                      <span className="text-[10px]" style={{ color: MUTED }}>Grupo {m.group}</span>
                    )}
                  </div>

                  {/* Participants vs score */}
                  <div className="flex items-center gap-3">
                    {/* P1 */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar name={p1Name} size={30} />
                      <p className={`text-sm truncate ${p1Won ? "font-bold" : "font-medium"}`}
                        style={{ color: p1Won ? TEXT : MUTED }}>{p1Name}</p>
                    </div>

                    {/* Score */}
                    {finished && sets?.length ? (
                      <div className="flex gap-1.5 flex-shrink-0">
                        {sets.map((s, i) => (
                          <div key={i} className="flex flex-col items-center" style={{ minWidth: 28 }}>
                            <span className="text-sm font-bold leading-none" style={{ color: s.s1 > s.s2 ? TEXT : MUTED }}>{s.s1}</span>
                            <span className="text-[8px] my-0.5" style={{ color: FAINT }}>-</span>
                            <span className="text-sm font-bold leading-none" style={{ color: s.s2 > s.s1 ? TEXT : MUTED }}>{s.s2}</span>
                          </div>
                        ))}
                      </div>
                    ) : finished && (m.score1 || m.score2) ? (
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                        <span className="text-base font-black" style={{ color: p1Won ? TEXT : MUTED }}>{m.score1 ?? "—"}</span>
                        <span className="text-[10px]" style={{ color: FAINT }}>vs</span>
                        <span className="text-base font-black" style={{ color: p2Won ? TEXT : MUTED }}>{m.score2 ?? "—"}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: FAINT }}>vs</span>
                    )}

                    {/* P2 */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <p className={`text-sm truncate text-right ${p2Won ? "font-bold" : "font-medium"}`}
                        style={{ color: p2Won ? TEXT : MUTED }}>{p2Name}</p>
                      <Avatar name={p2Name} size={30} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Inscription form ─────────────────────────────────────────────────
function InscriptionForm({ tournament, tournamentId }: { tournament: Tournament; tournamentId: string }) {
  const [categoryId, setCategoryId] = useState(tournament.categories?.length === 1 ? tournament.categories[0].id : "")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [success, setSuccess] = useState(false)
  const [restrictions, setRestrictions] = useState<Restriction[]>([])
  const [showModal, setShowModal] = useState(false)

  const [indName, setIndName] = useState(""); const [indEmail, setIndEmail] = useState(""); const [indPhone, setIndPhone] = useState(""); const [indRut, setIndRut] = useState("")
  const [p1Name, setP1Name] = useState(""); const [p1Email, setP1Email] = useState(""); const [p1Phone, setP1Phone] = useState(""); const [p1Rut, setP1Rut] = useState("")
  const [p2Name, setP2Name] = useState(""); const [p2Email, setP2Email] = useState(""); const [p2Phone, setP2Phone] = useState("")
  const [teamName, setTeamName] = useState(""); const [teamEmail, setTeamEmail] = useState(""); const [teamPhone, setTeamPhone] = useState(""); const [teamRut, setTeamRut] = useState("")
  const [teamPlayers, setTeamPlayers] = useState<string[]>(["",""])

  const entryFee = tournament.entryFee ? Number(tournament.entryFee) : 0
  const isFull = tournament.maxParticipants ? tournament.registeredCount >= tournament.maxParticipants : false
  const deadlinePassed = tournament.registrationDeadline ? new Date() > new Date(tournament.registrationDeadline) : false
  const canRegister = tournament.status === "OPEN" && !isFull && !deadlinePassed
  const type = tournament.participantType

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:opacity-30 transition-all"
  const inputStyle = { background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER2}`, color: TEXT }
  const labelCls = "text-[10px] font-bold uppercase tracking-wider block mb-1.5"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    if (tournament.categories?.length && !categoryId) { setFormError("Selecciona una categoría"); return }

    let submitName = "", submitEmail = "", submitPhone = "", submitRut = ""
    let submitPlayers: { name: string; email?: string }[] = []

    if (type === "INDIVIDUAL") {
      if (!indName.trim()) { setFormError("Ingresa tu nombre"); return }
      if (!indRut.trim())  { setFormError("Ingresa tu RUT"); return }
      if (!indEmail.trim()){ setFormError("Ingresa tu email"); return }
      if (!indPhone.trim()){ setFormError("Ingresa tu teléfono WhatsApp"); return }
      submitName = indName.trim(); submitEmail = indEmail.trim(); submitPhone = indPhone.trim(); submitRut = indRut.trim()
    } else if (type === "PAIR") {
      if (!p1Name.trim() || !p1Email.trim()) { setFormError("Completa los datos del Jugador 1"); return }
      if (!p1Rut.trim()) { setFormError("Ingresa el RUT del Jugador 1"); return }
      if (!p1Phone.trim()) { setFormError("Ingresa el WhatsApp del Jugador 1"); return }
      const p2f = p2Name.trim() || p2Email.trim()
      if (p2f && (!p2Name.trim() || !p2Email.trim())) { setFormError("Completa nombre y email del Jugador 2, o déjalo vacío"); return }
      submitName = p2Name.trim() ? `${p1Name.trim()} / ${p2Name.trim()}` : p1Name.trim()
      submitEmail = p1Email.trim(); submitPhone = p1Phone.trim(); submitRut = p1Rut.trim()
      submitPlayers = [{ name: p1Name.trim(), email: p1Email.trim() }]
      if (p2Name.trim()) submitPlayers.push({ name: p2Name.trim(), email: p2Email.trim() })
    } else if (type === "TEAM") {
      if (!teamName.trim()) { setFormError("Ingresa el nombre del equipo"); return }
      if (!teamRut.trim())  { setFormError("Ingresa el RUT del contacto"); return }
      if (!teamEmail.trim()){ setFormError("Ingresa el email de contacto"); return }
      if (!teamPhone.trim()){ setFormError("Ingresa el WhatsApp de contacto"); return }
      const vp = teamPlayers.map(p => p.trim()).filter(Boolean)
      if (vp.length < 2) { setFormError("Agrega al menos 2 integrantes"); return }
      submitName = teamName.trim(); submitEmail = teamEmail.trim(); submitPhone = teamPhone.trim(); submitRut = teamRut.trim()
      submitPlayers = vp.map(n => ({ name: n }))
    }

    setSubmitting(true)
    const res = await fetch(`/api/public/tournaments/${tournamentId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: submitName, email: submitEmail, phone: submitPhone, rut: submitRut, players: submitPlayers, categoryId: categoryId || null, restrictions }),
    })
    const data = await res.json()
    if (!res.ok) { setFormError(data.error || "Error al inscribirse"); setSubmitting(false); return }
    if (data.requiresPayment && data.paymentUrl) {
      window.location.href = `${data.paymentUrl}?token=${data.token}`
    } else { setSuccess(true) }
    setSubmitting(false)
  }

  if (!canRegister) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: CARD, border: `1px solid ${BORDER2}` }}>
      <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: TEXT }} />
      <p className="font-bold text-white text-lg">
        {deadlinePassed ? "Plazo vencido" : isFull ? "Torneo lleno" : STATUS_LABEL[tournament.status] ?? "Inscripciones cerradas"}
      </p>
      <p className="text-sm mt-1" style={{ color: MUTED }}>Las inscripciones ya no están disponibles.</p>
    </div>
  )

  if (success) return (
    <div className="rounded-2xl p-10 text-center" style={{ background: CARD, border: `1px solid rgba(34,197,94,0.3)` }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(34,197,94,0.12)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <p className="text-xl font-black text-white">¡Inscripción confirmada!</p>
      <p className="text-sm mt-2" style={{ color: MUTED }}>Recibirás información por email.</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm font-black uppercase tracking-widest" style={{ color: ACCENT }}>
        {type === "PAIR" ? "Inscripción de pareja" : type === "TEAM" ? "Inscripción de equipo" : "Inscripción"}
      </p>

      {tournament.categories?.length > 0 && (
        <div>
          <label className={labelCls} style={{ color: MUTED }}>Categoría *</label>
          <div className="flex flex-wrap gap-2">
            {tournament.categories.map(cat => (
              <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={categoryId === cat.id
                  ? { background: ACCENT, color: BG }
                  : { background: "rgba(255,255,255,0.06)", color: MUTED, border: `1px solid ${BORDER2}` }}>
                <Tag className="w-3 h-3 inline mr-1" />{cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === "INDIVIDUAL" && (
        <>
          {([["Nombre completo *","text",indName,setIndName,"Ej: Juan Pérez"],
             ["RUT *","text",indRut,(v:string) => setIndRut(formatRut(v)),"Ej: 12.345.678-9"],
             ["Email *","email",indEmail,setIndEmail,"tu@email.com"],
             ["WhatsApp *","tel",indPhone,setIndPhone,"+56 9 1234 5678"],
          ] as [string,string,string,(v:string)=>void,string][]).map(([label,type,val,set,ph]) => (
            <div key={label}>
              <label className={labelCls} style={{ color: MUTED }}>{label}</label>
              <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                className={inputCls} style={inputStyle} />
            </div>
          ))}
        </>
      )}

      {type === "PAIR" && (
        <>
          {[["Jugador 1",[["Nombre completo *","text",p1Name,setP1Name,"Ej: Juan Pérez"],["RUT *","text",p1Rut,(v:string)=>setP1Rut(formatRut(v)),"12.345.678-9"],["Email *","email",p1Email,setP1Email,"juan@email.com"],["WhatsApp *","tel",p1Phone,setP1Phone,"+56 9 1234 5678"]]],
             ["Jugador 2",[["Nombre","text",p2Name,setP2Name,"Ej: María García"],["Email","email",p2Email,setP2Email,"maria@email.com"]]],
          ] as [string,[string,string,string,(v:string)=>void,string][]][]).map(([title, fields]) => (
            <div key={title} className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER2}` }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: ACCENT }}>{title}</p>
              {(fields as [string,string,string,(v:string)=>void,string][]).map(([label,type,val,set,ph]) => (
                <div key={label}>
                  <label className={labelCls} style={{ color: MUTED }}>{label}</label>
                  <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    className={inputCls} style={inputStyle} />
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {type === "TEAM" && (
        <>
          {([["Nombre del equipo *","text",teamName,setTeamName,"Los Campeones"],["RUT contacto *","text",teamRut,(v:string)=>setTeamRut(formatRut(v)),"12.345.678-9"],["Email contacto *","email",teamEmail,setTeamEmail,"capitan@email.com"],["WhatsApp *","tel",teamPhone,setTeamPhone,"+56 9 1234 5678"]] as [string,string,string,(v:string)=>void,string][]).map(([label,t,val,set,ph]) => (
            <div key={label}>
              <label className={labelCls} style={{ color: MUTED }}>{label}</label>
              <input type={t} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                className={inputCls} style={inputStyle} />
            </div>
          ))}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER2}` }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: ACCENT }}>Integrantes</p>
              <button type="button" onClick={() => setTeamPlayers(p => [...p,""])}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                style={{ background: "rgba(56,189,248,0.15)", color: ACCENT }}>
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            {teamPlayers.map((p,i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-[10px] font-bold w-5 text-center flex-shrink-0" style={{ color: FAINT }}>{i+1}</span>
                <input value={p} onChange={e => setTeamPlayers(pl => pl.map((x,j) => j===i ? e.target.value : x))}
                  placeholder={`Jugador ${i+1}`} className="flex-1 rounded-xl px-3 py-2.5 text-sm placeholder:opacity-30 outline-none"
                  style={inputStyle} />
                {teamPlayers.length > 2 && (
                  <button type="button" onClick={() => setTeamPlayers(pl => pl.filter((_,j) => j!==i))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: MUTED }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tournament.allowScheduleRestrictions && tournament.scheduleDays.length > 0 && (
        <button type="button" onClick={() => setShowModal(true)}
          className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-between px-4"
          style={{ background: "rgba(255,255,255,0.04)", border: `1.5px solid ${restrictions.length > 0 ? "#f87171" : BORDER2}`, color: restrictions.length > 0 ? "#f87171" : MUTED }}>
          <span>¿Cuándo no puedes jugar?</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: restrictions.length > 0 ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)", color: restrictions.length > 0 ? "#f87171" : FAINT }}>
            {restrictions.length > 0 ? `${restrictions.length} bloqueo${restrictions.length!==1?"s":""}` : "Opcional"}
          </span>
        </button>
      )}

      {formError && (
        <p className="text-xs font-semibold px-3 py-2.5 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {formError}
        </p>
      )}

      <button type="submit" disabled={submitting}
        className="w-full h-14 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{ background: ACCENT, color: BG }}>
        {submitting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <>{entryFee > 0 ? `Inscribirse — ${fmt(entryFee)}` : "Inscribirse gratis"} <ChevronRight className="w-4 h-4" /></>}
      </button>

      {showModal && (
        <RestrictionsModal
          scheduleDays={tournament.scheduleDays}
          maxRestrictions={tournament.maxRestrictionsPerParticipant}
          restrictions={restrictions}
          onChange={setRestrictions}
          onClose={() => setShowModal(false)}
        />
      )}
    </form>
  )
}

// ── Main page ────────────────────────────────────────────────────────
type Tab = "ranking" | "partidos" | "info"

export default function TournamentPublicPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [participantType, setParticipantType] = useState("PAIR")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Tab>("ranking")

  useEffect(() => {
    Promise.all([
      fetch(`/api/public/tournaments/${tournamentId}`).then(r => r.json()),
      fetch(`/api/public/tournaments/${tournamentId}/standings`).then(r => r.json()),
    ]).then(([td, sd]) => {
      if (td.error) { setError(td.error); return }
      setTournament(td.tournament)
      if (td.tournament.status === "OPEN") setTab("info")
      if (!sd.error) {
        setStandings(sd.standings ?? [])
        setMatches(sd.matches ?? [])
        setParticipantType(sd.participantType ?? "PAIR")
      }
    }).catch(() => setError("Error al cargar")).finally(() => setLoading(false))
  }, [tournamentId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
    </div>
  )
  if (error || !tournament) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="text-center space-y-3">
        <Trophy className="w-12 h-12 mx-auto opacity-10" style={{ color: TEXT }} />
        <p className="font-bold text-white">{error || "Torneo no encontrado"}</p>
      </div>
    </div>
  )

  const tabs: { id: Tab; label: string }[] = [
    { id: "ranking",  label: "Ranking" },
    { id: "partidos", label: "Partidos" },
    { id: "info",     label: "Información" },
  ]

  const dot = STATUS_DOT[tournament.status] ?? MUTED
  const finishedCount = matches.filter(m => m.status === "FINISHED").length

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT }}>

      {/* ── Nav bar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ background: `${BG}ee`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER2}` }}>
        <div className="flex items-center gap-2">
          {tournament.business.logoUrl
            ? <img src={tournament.business.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
            : <Trophy className="w-5 h-5" style={{ color: ACCENT }} />}
          <span className="text-sm font-black" style={{ color: TEXT }}>{tournament.business.name}</span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: `${dot}18`, color: dot, border: `1px solid ${dot}30` }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
          {STATUS_LABEL[tournament.status] ?? tournament.status}
        </span>
      </div>

      {/* ── Hero ── */}
      <div className="relative" style={{ minHeight: 220 }}>
        {tournament.flyer ? (
          <>
            <img src={tournament.flyer} alt="" className="w-full object-cover" style={{ maxHeight: 280, objectFit: "cover" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,27,42,0.3) 0%, rgba(13,27,42,0.95) 100%)" }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, rgba(56,189,248,0.08) 0%, ${BG} 100%)` }} />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-12 max-w-2xl mx-auto w-full">
          {(tournament.sport || tournament.format) && (
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: ACCENT }}>
              {[tournament.sport, FORMAT_LABELS[tournament.format], TYPE_LABELS[tournament.participantType]].filter(Boolean).join("  ·  ")}
            </p>
          )}
          <h1 className="text-2xl font-black text-white uppercase leading-tight tracking-wide">
            {tournament.name}
          </h1>
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(tournament.startDate), "d MMM yyyy", { locale: es })}
              {tournament.endDate && ` — ${format(new Date(tournament.endDate), "d MMM yyyy", { locale: es })}`}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
              <Users className="w-3.5 h-3.5" />
              {tournament.registeredCount}{tournament.maxParticipants ? `/${tournament.maxParticipants}` : ""} inscritos
            </span>
            {finishedCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
                <Trophy className="w-3.5 h-3.5" />
                {finishedCount} partidos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-[53px] z-20 flex gap-0"
        style={{ background: `${BG}f0`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-2xl mx-auto w-full flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-3.5 text-sm font-bold transition-all relative"
              style={{ color: tab === t.id ? ACCENT : MUTED }}>
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: ACCENT }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {tab === "ranking" && <StandingsTable rows={standings} participantType={participantType} />}

        {tab === "partidos" && <MatchesList matches={matches} participantType={participantType} />}

        {tab === "info" && (
          <div className="space-y-6">
            {/* Tournament details */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {[
                { label: "Deporte", value: tournament.sport },
                { label: "Formato", value: FORMAT_LABELS[tournament.format] },
                { label: "Modalidad", value: TYPE_LABELS[tournament.participantType] },
                { label: "Inicio", value: format(new Date(tournament.startDate), "d 'de' MMMM yyyy", { locale: es }) },
                tournament.endDate ? { label: "Fin", value: format(new Date(tournament.endDate), "d 'de' MMMM yyyy", { locale: es }) } : null,
                tournament.registrationDeadline ? { label: "Cierre inscripciones", value: format(new Date(tournament.registrationDeadline), "d 'de' MMMM yyyy", { locale: es }) } : null,
                tournament.maxParticipants ? { label: "Cupos", value: `${tournament.registeredCount}/${tournament.maxParticipants}` } : null,
                tournament.entryFee ? { label: "Inscripción", value: fmt(Number(tournament.entryFee)) } : { label: "Inscripción", value: "Gratis" },
              ].filter(Boolean).map(row => (
                <div key={row!.label} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold" style={{ color: MUTED }}>{row!.label}</span>
                  <span className="text-sm font-bold text-right" style={{ color: TEXT }}>{row!.value}</span>
                </div>
              ))}
              {tournament.description && (
                <div className="pt-2" style={{ borderTop: `1px solid ${BORDER2}` }}>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{tournament.description}</p>
                </div>
              )}
            </div>

            {/* Inscription form */}
            <InscriptionForm tournament={tournament} tournamentId={tournamentId} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <p className="text-[10px]" style={{ color: FAINT }}>
          Gestionado por <span style={{ color: `${ACCENT}60` }}>AgendaMok Sports</span>
        </p>
      </div>
    </div>
  )
}
