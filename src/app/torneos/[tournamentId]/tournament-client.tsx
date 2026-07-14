"use client"
import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Trophy, Calendar, Users, Tag, ChevronRight, Loader2, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"

const FORMAT_LABELS: Record<string, string> = {
  ELIMINATION: "Eliminación directa",
  ROUND_ROBIN: "Round Robin",
  GROUP_STAGE: "Fase de grupos",
}
const TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual",
  PAIR: "Parejas",
  TEAM: "Equipos",
}
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Inscripciones abiertas",
  IN_PROGRESS: "En curso",
  FINISHED: "Finalizado",
}

function fmt(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}

type Category = { id: string; name: string; description: string | null }
type ScheduleDay = { id: string; date: string; startTime: string; endTime: string; sortOrder: number; allowRestrictions: boolean }
type Tournament = {
  id: string; name: string; sport: string | null; format: string; participantType: string
  startDate: string; endDate: string; maxParticipants: number | null; entryFee: string | null
  status: string; description: string | null; categories: Category[]; registeredCount: number
  business: { name: string; logoUrl: string | null }; paymentEnabled: boolean
  flyer: string | null
  scheduleDays: ScheduleDay[]
  allowScheduleRestrictions: boolean
  maxRestrictionsPerParticipant: number
}

type Restriction = { date: string; time: string }

// Generate hourly slots between startTime and endTime
function buildHourlySlots(startTime: string, endTime: string): string[] {
  const slots: string[] = []
  const [sh] = startTime.split(":").map(Number)
  const [eh] = endTime.split(":").map(Number)
  for (let h = sh; h < eh; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`)
  }
  return slots
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

function ScheduleRestrictionsModal({
  scheduleDays,
  maxRestrictions,
  restrictions,
  onChange,
  onClose,
}: {
  scheduleDays: ScheduleDay[]
  maxRestrictions: number
  restrictions: Restriction[]
  onChange: (r: Restriction[]) => void
  onClose: () => void
}) {
  const toggle = (date: string, time: string) => {
    const key = `${date}|${time}`
    const exists = restrictions.some(r => `${r.date}|${r.time}` === key)
    if (exists) {
      onChange(restrictions.filter(r => `${r.date}|${r.time}` !== key))
    } else {
      if (maxRestrictions > 0 && restrictions.length >= maxRestrictions) return
      onChange([...restrictions, { date, time }])
    }
  }

  const isBlocked = (date: string, time: string) =>
    restrictions.some(r => r.date === date && r.time === time)

  const remaining = maxRestrictions > 0 ? maxRestrictions - restrictions.length : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: NAVY }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5" style={{ background: "rgba(201,168,76,0.08)", borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ color: "rgba(255,255,255,0.5)" }}>
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-white">Horario</p>
          {remaining !== null && (
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              {remaining > 0 ? `${remaining} bloqueo${remaining !== 1 ? "s" : ""} disponible${remaining !== 1 ? "s" : ""}` : "Límite alcanzado"}
            </p>
          )}
        </div>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: "rgba(201,168,76,0.15)", color: GOLD }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {scheduleDays.map(day => {
          const slots = buildHourlySlots(day.startTime, day.endTime)
          return (
            <div key={day.id}>
              {/* Day header */}
              <div className="px-4 py-2.5 sticky top-0 z-10" style={{ background: day.allowRestrictions ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)" }}>
                <p className="text-xs font-bold" style={{ color: day.allowRestrictions ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>
                  {formatDayLabel(day.date)}
                  {!day.allowRestrictions && <span className="ml-2 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>(No seleccionable)</span>}
                </p>
              </div>
              {/* Slots */}
              {slots.map(time => {
                const blocked = isBlocked(day.date, time)
                const canBlock = day.allowRestrictions && (remaining === null || remaining > 0 || blocked)
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={!canBlock}
                    onClick={() => canBlock && toggle(day.date, time)}
                    className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
                    style={{
                      background: blocked ? "rgba(239,68,68,0.08)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      cursor: canBlock ? "pointer" : "default",
                      opacity: !day.allowRestrictions ? 0.35 : 1,
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: blocked ? "#f87171" : "rgba(255,255,255,0.7)" }}>{time}</span>
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

const labelCls = "text-[10px] font-bold uppercase tracking-[0.1em] block mb-1.5"
const inputCls = "w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-30 outline-none"
const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "white",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls} style={{ color: "rgba(255,255,255,0.4)" }}>{label}</label>
      {children}
    </div>
  )
}

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function PhoneField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5" style={{ color: "#25D366" }}>
          <WhatsAppIcon size={15} />
        </span>
        <input type="tel" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? "+56 9 1234 5678"}
          className={inputCls}
          style={{ ...inputStyle, paddingLeft: "2.25rem" }} />
      </div>
    </Field>
  )
}

export default function TournamentPublicPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [success, setSuccess] = useState(false)

  // Schedule restrictions
  const [restrictions, setRestrictions] = useState<Restriction[]>([])
  const [showRestrictionsModal, setShowRestrictionsModal] = useState(false)

  // INDIVIDUAL
  const [indName, setIndName] = useState("")
  const [indEmail, setIndEmail] = useState("")
  const [indPhone, setIndPhone] = useState("")

  // PAIR
  const [p1Name, setP1Name] = useState("")
  const [p1Email, setP1Email] = useState("")
  const [p1Phone, setP1Phone] = useState("")
  const [p2Name, setP2Name] = useState("")
  const [p2Email, setP2Email] = useState("")
  const [p2Phone, setP2Phone] = useState("")

  // TEAM
  const [teamName, setTeamName] = useState("")
  const [teamEmail, setTeamEmail] = useState("")
  const [teamPhone, setTeamPhone] = useState("")
  const [teamPlayers, setTeamPlayers] = useState<string[]>(["", ""])

  useEffect(() => {
    fetch(`/api/public/tournaments/${tournamentId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else {
          setTournament(d.tournament)
          if (d.tournament.categories?.length === 1) setCategoryId(d.tournament.categories[0].id)
        }
      })
      .catch(() => setError("Error al cargar"))
      .finally(() => setLoading(false))
  }, [tournamentId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    if (tournament?.categories?.length && !categoryId) {
      setFormError("Selecciona una categoría"); return
    }

    const type = tournament!.participantType
    let submitName = ""
    let submitEmail = ""
    let submitPlayers: { name: string; email?: string }[] = []
    let submitPhone = ""

    if (type === "INDIVIDUAL") {
      if (!indName.trim()) { setFormError("Ingresa tu nombre"); return }
      if (!indEmail.trim()) { setFormError("Ingresa tu email"); return }
      if (!indPhone.trim()) { setFormError("Ingresa tu teléfono WhatsApp"); return }
      submitName = indName.trim()
      submitEmail = indEmail.trim()
      submitPhone = indPhone.trim()
    } else if (type === "PAIR") {
      if (!p1Name.trim() || !p1Email.trim()) { setFormError("Completa los datos del Jugador 1"); return }
      if (!p1Phone.trim()) { setFormError("Ingresa el teléfono WhatsApp del Jugador 1"); return }
      if (!p2Name.trim() || !p2Email.trim()) { setFormError("Completa los datos del Jugador 2"); return }
      if (!p2Phone.trim()) { setFormError("Ingresa el teléfono WhatsApp del Jugador 2"); return }
      submitName = `${p1Name.trim()} / ${p2Name.trim()}`
      submitEmail = p1Email.trim()
      submitPhone = p1Phone.trim()
      submitPlayers = [
        { name: p1Name.trim(), email: p1Email.trim(), phone: p1Phone.trim() },
        { name: p2Name.trim(), email: p2Email.trim(), phone: p2Phone.trim() },
      ]
    } else if (type === "TEAM") {
      if (!teamName.trim()) { setFormError("Ingresa el nombre del equipo"); return }
      if (!teamEmail.trim()) { setFormError("Ingresa el email de contacto"); return }
      if (!teamPhone.trim()) { setFormError("Ingresa el teléfono WhatsApp de contacto"); return }
      const validPlayers = teamPlayers.map(p => p.trim()).filter(Boolean)
      if (validPlayers.length < 2) { setFormError("Agrega al menos 2 integrantes"); return }
      submitName = teamName.trim()
      submitEmail = teamEmail.trim()
      submitPhone = teamPhone.trim()
      submitPlayers = validPlayers.map(n => ({ name: n }))
    }

    setSubmitting(true)
    const res = await fetch(`/api/public/tournaments/${tournamentId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: submitName, email: submitEmail, phone: submitPhone, players: submitPlayers, categoryId: categoryId || null, restrictions }),
    })
    const data = await res.json()

    if (!res.ok) {
      setFormError(data.error || "Error al inscribirse")
      setSubmitting(false)
      return
    }

    if (data.requiresPayment && data.paymentUrl) {
      window.location.href = `${data.paymentUrl}?token=${data.token}`
    } else {
      setSuccess(true)
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  )

  if (error || !tournament) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
      <div className="text-center space-y-3">
        <Trophy className="w-12 h-12 mx-auto opacity-30" style={{ color: GOLD }} />
        <p className="text-white font-bold">{error || "Torneo no encontrado"}</p>
      </div>
    </div>
  )

  const isFull = tournament.maxParticipants ? tournament.registeredCount >= tournament.maxParticipants : false
  const canRegister = tournament.status === "OPEN" && !isFull
  const entryFee = tournament.entryFee ? Number(tournament.entryFee) : 0
  const requiresPayment = entryFee > 0 && tournament.paymentEnabled
  const type = tournament.participantType

  // Info cards — shared between layouts
  const infoCards = (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Calendar className="w-4 h-4 mx-auto mb-1" style={{ color: GOLD }} />
        <p className="text-xs font-bold text-white">{format(new Date(tournament.startDate), "d MMM", { locale: es })}</p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{format(new Date(tournament.startDate), "HH:mm")} hrs</p>
      </div>
      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Users className="w-4 h-4 mx-auto mb-1" style={{ color: GOLD }} />
        <p className="text-xs font-bold text-white">
          {tournament.registeredCount}{tournament.maxParticipants ? `/${tournament.maxParticipants}` : ""} inscritos
        </p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{TYPE_LABELS[type]}</p>
      </div>
      <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Trophy className="w-4 h-4 mx-auto mb-1" style={{ color: GOLD }} />
        <p className="text-xs font-bold text-white">{FORMAT_LABELS[tournament.format]}</p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Formato</p>
      </div>
      <div className="rounded-xl p-3 text-center" style={{ background: entryFee ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.05)", border: entryFee ? `1px solid rgba(201,168,76,0.3)` : "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-sm font-black mt-1" style={{ color: entryFee ? GOLD : "rgba(255,255,255,0.5)" }}>
          {entryFee ? fmt(entryFee) : "Gratis"}
        </p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
          {type === "INDIVIDUAL" ? "por persona" : type === "PAIR" ? "por pareja" : "por equipo"}
        </p>
      </div>
    </div>
  )

  // Registration form content — shared
  const formContent = !canRegister ? (
    <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <p className="font-bold text-white">
        {tournament.status === "OPEN" && isFull ? "Torneo lleno" : STATUS_LABELS[tournament.status] ?? "Inscripciones cerradas"}
      </p>
      <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Las inscripciones ya no están disponibles.</p>
    </div>
  ) : success ? (
    <div className="rounded-2xl p-8 text-center space-y-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(34,197,94,0.15)" }}>
        <Trophy className="w-7 h-7" style={{ color: "#22c55e" }} />
      </div>
      <p className="text-xl font-black text-white">¡Inscripción confirmada!</p>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
        {type === "PAIR"
          ? `La pareja ha sido inscrita en ${tournament.name}.`
          : type === "TEAM"
          ? `El equipo ha sido inscrito en ${tournament.name}.`
          : `Te has inscrito en ${tournament.name}.`}
        {" "}Recibirás información por email.
      </p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-white">
          {type === "PAIR" ? "Inscripción de pareja" : type === "TEAM" ? "Inscripción de equipo" : "Inscripción"}
        </p>
        {type === "PAIR" && <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Completa los datos de ambos jugadores</p>}
        {type === "TEAM" && <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Datos del equipo e integrantes</p>}
      </div>

      {tournament.categories?.length > 0 && (
        <Field label="Categoría *">
          <div className="flex flex-wrap gap-2 mt-1">
            {tournament.categories.map(cat => (
              <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={categoryId === cat.id
                  ? { background: "rgba(201,168,76,0.2)", border: `1.5px solid ${GOLD}`, color: GOLD }
                  : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                <Tag className="w-3 h-3 inline mr-1" />{cat.name}
              </button>
            ))}
          </div>
        </Field>
      )}

      {type === "INDIVIDUAL" && (
        <>
          <Field label="Nombre completo *">
            <input value={indName} onChange={e => setIndName(e.target.value)}
              placeholder="Ej: Juan Pérez" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Email *">
            <input type="email" value={indEmail} onChange={e => setIndEmail(e.target.value)}
              placeholder="tu@email.com" className={inputCls} style={inputStyle} />
          </Field>
          <PhoneField label="WhatsApp *" value={indPhone} onChange={setIndPhone} />
        </>
      )}

      {type === "PAIR" && (
        <>
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: GOLD }}>Jugador 1</p>
            <Field label="Nombre completo *">
              <input value={p1Name} onChange={e => setP1Name(e.target.value)}
                placeholder="Ej: Juan Pérez" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Email *">
              <input type="email" value={p1Email} onChange={e => setP1Email(e.target.value)}
                placeholder="juan@email.com" className={inputCls} style={inputStyle} />
            </Field>
            <PhoneField label="WhatsApp *" value={p1Phone} onChange={setP1Phone} />
          </div>
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: GOLD }}>Jugador 2</p>
            <Field label="Nombre completo *">
              <input value={p2Name} onChange={e => setP2Name(e.target.value)}
                placeholder="Ej: María García" className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Email *">
              <input type="email" value={p2Email} onChange={e => setP2Email(e.target.value)}
                placeholder="maria@email.com" className={inputCls} style={inputStyle} />
            </Field>
            <PhoneField label="WhatsApp *" value={p2Phone} onChange={setP2Phone} />
          </div>
        </>
      )}

      {type === "TEAM" && (
        <>
          <Field label="Nombre del equipo *">
            <input value={teamName} onChange={e => setTeamName(e.target.value)}
              placeholder="Ej: Los Campeones" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Email de contacto *">
            <input type="email" value={teamEmail} onChange={e => setTeamEmail(e.target.value)}
              placeholder="capitan@email.com" className={inputCls} style={inputStyle} />
          </Field>
          <PhoneField label="WhatsApp de contacto *" value={teamPhone} onChange={setTeamPhone} />
          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: GOLD }}>
                Integrantes <span style={{ color: "rgba(255,255,255,0.3)" }}>(mín. 2)</span>
              </p>
              <button type="button" onClick={() => setTeamPlayers(p => [...p, ""])}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {teamPlayers.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-[10px] font-bold w-5 text-center flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{i + 1}</span>
                  <input value={p} onChange={e => setTeamPlayers(pl => pl.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={`Jugador ${i + 1}`}
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm placeholder:opacity-30 outline-none"
                    style={inputStyle} />
                  {teamPlayers.length > 2 && (
                    <button type="button" onClick={() => setTeamPlayers(pl => pl.filter((_, j) => j !== i))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ color: "rgba(255,255,255,0.3)" }}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tournament.allowScheduleRestrictions && tournament.scheduleDays.length > 0 && (
        <button type="button" onClick={() => setShowRestrictionsModal(true)}
          className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-between px-4 transition-all"
          style={{ background: "rgba(239,68,68,0.07)", border: `1px solid ${restrictions.length > 0 ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`, color: restrictions.length > 0 ? "#f87171" : "rgba(255,255,255,0.55)" }}>
          <span>¿Cuándo no puedes jugar?</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: restrictions.length > 0 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)", color: restrictions.length > 0 ? "#f87171" : "rgba(255,255,255,0.4)" }}>
            {restrictions.length > 0 ? `${restrictions.length} bloqueo${restrictions.length !== 1 ? "s" : ""}` : "Opcional"}
          </span>
        </button>
      )}

      {formError && (
        <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
          {formError}
        </p>
      )}

      <button type="submit" disabled={submitting}
        className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{ background: requiresPayment ? GOLD : "rgba(34,197,94,0.2)", color: requiresPayment ? NAVY : "#22c55e", border: requiresPayment ? "none" : "1px solid rgba(34,197,94,0.4)" }}>
        {submitting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <>
              {requiresPayment ? `Pagar ${fmt(entryFee)} e inscribirse` : "Inscribirse gratis"}
              <ChevronRight className="w-4 h-4" />
            </>}
      </button>

      {requiresPayment && (
        <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
          Serás redirigido a Flow para completar el pago de forma segura.
        </p>
      )}
    </form>
  )

  return (
    <div className="min-h-screen" style={{ background: NAVY }}>

      {tournament.flyer ? (
        /* ── Desktop: flyer izquierda + info+form derecha ── */
        <div className="min-h-screen flex flex-col lg:flex-row">

          {/* Columna izquierda — flyer sticky */}
          <div className="lg:w-[45%] lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden flex-shrink-0">
            <img
              src={tournament.flyer}
              alt={tournament.name}
              className="w-full h-full object-cover lg:object-cover"
              style={{ display: "block", maxHeight: "100svh" }}
            />
          </div>

          {/* Columna derecha — scroll */}
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-6 pt-10 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{tournament.business.name}</p>
              <h1 className="text-3xl font-black text-white uppercase tracking-wide leading-tight">{tournament.name}</h1>
              {tournament.sport && <p className="text-sm mt-1 font-medium" style={{ color: GOLD }}>{tournament.sport}</p>}
            </div>

            {/* Info cards */}
            <div className="px-6 mb-6">{infoCards}</div>

            {/* Description */}
            {tournament.description && (
              <div className="px-6 mb-6">
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{tournament.description}</p>
              </div>
            )}

            {/* Form */}
            <div className="px-6 pb-16">{formContent}</div>
          </div>
        </div>
      ) : (
        /* ── Sin flyer: layout single-column centrado ── */
        <div>
          <div className="px-4 pt-10 pb-6 max-w-lg mx-auto text-center">
            {tournament.business.logoUrl
              ? <img src={tournament.business.logoUrl} alt="" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4" />
              : <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(201,168,76,0.15)" }}>
                  <Trophy className="w-7 h-7" style={{ color: GOLD }} />
                </div>
            }
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>{tournament.business.name}</p>
            <h1 className="text-2xl font-black text-white uppercase tracking-wide">{tournament.name}</h1>
            {tournament.sport && <p className="text-sm mt-1" style={{ color: GOLD }}>{tournament.sport}</p>}
          </div>
          <div className="max-w-lg mx-auto px-4 mb-6">{infoCards}</div>
          {tournament.description && (
            <div className="max-w-lg mx-auto px-4 mb-6">
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{tournament.description}</p>
            </div>
          )}
          <div className="max-w-lg mx-auto px-4 pb-16">{formContent}</div>
        </div>
      )}

      {/* Schedule restrictions modal */}
      {showRestrictionsModal && tournament.allowScheduleRestrictions && (
        <ScheduleRestrictionsModal
          scheduleDays={tournament.scheduleDays}
          maxRestrictions={tournament.maxRestrictionsPerParticipant}
          restrictions={restrictions}
          onChange={setRestrictions}
          onClose={() => setShowRestrictionsModal(false)}
        />
      )}
    </div>
  )
}

