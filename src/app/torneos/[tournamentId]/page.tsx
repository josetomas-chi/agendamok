"use client"
import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Trophy, Calendar, Users, Tag, ChevronRight, Loader2 } from "lucide-react"
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
type Tournament = {
  id: string; name: string; sport: string | null; format: string; participantType: string
  startDate: string; endDate: string; maxParticipants: number | null; entryFee: string | null
  status: string; description: string | null; categories: Category[]; registeredCount: number
  business: { name: string; logoUrl: string | null }; paymentEnabled: boolean
}

export default function TournamentPublicPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Form
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [players, setPlayers] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [success, setSuccess] = useState(false)

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
    if (!name.trim()) { setFormError("Ingresa tu nombre"); return }
    if (!email.trim()) { setFormError("Ingresa tu email"); return }
    if (tournament?.categories?.length && !categoryId) { setFormError("Selecciona una categoría"); return }

    setSubmitting(true)
    const playersArr = players ? players.split(",").map(s => s.trim()).filter(Boolean).map(n => ({ name: n })) : []

    const res = await fetch(`/api/public/tournaments/${tournamentId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), players: playersArr, categoryId: categoryId || null }),
    })
    const data = await res.json()

    if (!res.ok) {
      setFormError(data.error || "Error al inscribirse")
      setSubmitting(false)
      return
    }

    if (data.requiresPayment && data.paymentUrl) {
      // Redirect to Flow
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
  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    outline: "none",
  }

  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-6 max-w-lg mx-auto text-center">
        {tournament.business.logoUrl
          ? <img src={tournament.business.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover mx-auto mb-4" />
          : <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(201,168,76,0.15)" }}>
              <Trophy className="w-6 h-6" style={{ color: GOLD }} />
            </div>
        }
        <p className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{tournament.business.name}</p>
        <h1 className="text-2xl font-black text-white uppercase tracking-wide">{tournament.name}</h1>
        {tournament.sport && <p className="text-sm mt-1" style={{ color: GOLD }}>{tournament.sport}</p>}
      </div>

      {/* Info cards */}
      <div className="max-w-lg mx-auto px-4 grid grid-cols-2 gap-3 mb-6">
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
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{TYPE_LABELS[tournament.participantType]}</p>
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
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Inscripción</p>
        </div>
      </div>

      {tournament.description && (
        <div className="max-w-lg mx-auto px-4 mb-6">
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{tournament.description}</p>
        </div>
      )}

      {/* Registration form */}
      <div className="max-w-lg mx-auto px-4 pb-16">
        {!canRegister ? (
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
              Te has inscrito en {tournament.name}. Recibirás información adicional por email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-sm font-black uppercase tracking-wide text-white">Inscripción</p>

            {tournament.categories?.length > 0 && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide block mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Categoría *
                </label>
                <div className="flex flex-wrap gap-2">
                  {tournament.categories.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                      style={categoryId === cat.id
                        ? { background: "rgba(201,168,76,0.2)", border: `1.5px solid ${GOLD}`, color: GOLD }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                      <Tag className="w-3 h-3 inline mr-1" />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                {tournament.participantType === "INDIVIDUAL" ? "Nombre completo" : tournament.participantType === "PAIR" ? "Nombre de la pareja" : "Nombre del equipo"} *
              </label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Juan Pérez"
                className="w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-30"
                style={inputStyle} />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Email *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="tu@email.com"
                className="w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-30"
                style={inputStyle} />
            </div>

            {tournament.participantType !== "INDIVIDUAL" && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide block mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {tournament.participantType === "PAIR" ? "Jugadores (separados por coma)" : "Integrantes del equipo"}
                </label>
                <input value={players} onChange={e => setPlayers(e.target.value)} placeholder="Juan, María"
                  className="w-full rounded-xl px-4 py-3 text-sm placeholder:opacity-30"
                  style={inputStyle} />
              </div>
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
                  </>
              }
            </button>

            {requiresPayment && (
              <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                Serás redirigido a Flow para completar el pago de forma segura.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
