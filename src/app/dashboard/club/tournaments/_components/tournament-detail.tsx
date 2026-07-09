"use client"
import React, { useState, useEffect, useCallback } from "react"
import { ArrowLeft, UserPlus, Play, Trophy, X, Check, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"

const FORMAT_LABELS = { ELIMINATION: "Eliminación directa", ROUND_ROBIN: "Round Robin" }
const TYPE_LABELS = { INDIVIDUAL: "Individual", PAIR: "Parejas", TEAM: "Equipos" }
const STATUS_LABELS = { DRAFT: "Borrador", OPEN: "Inscripciones abiertas", IN_PROGRESS: "En curso", FINISHED: "Finalizado" }

type Participant = { id: string; name: string; players: string[] | { name: string }[]; seed: number | null; status: string }
type Match = {
  id: string; round: number; matchNumber: number; status: string
  score1: string | null; score2: string | null
  participant1: Participant | null; participant2: Participant | null; winner: Participant | null
}
type Tournament = {
  id: string; name: string; sport: string | null
  format: "ELIMINATION" | "ROUND_ROBIN"; participantType: "INDIVIDUAL" | "PAIR" | "TEAM"
  startDate: string; endDate: string; maxParticipants: number | null
  entryFee: string | null; status: "DRAFT" | "OPEN" | "IN_PROGRESS" | "FINISHED"
  description: string | null; participants: Participant[]; matches: Match[]
}

function fmt(n: number) { return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }) }

export default function TournamentDetail({ businessId, tournamentId, onBack }: {
  businessId: string; tournamentId: string; onBack: () => void
}) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"participants" | "fixture">("participants")
  const [addName, setAddName] = useState("")
  const [addPlayers, setAddPlayers] = useState("")
  const [addSaving, setAddSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [resultMatch, setResultMatch] = useState<Match | null>(null)
  const [score1, setScore1] = useState("")
  const [score2, setScore2] = useState("")
  const [winnerId, setWinnerId] = useState("")
  const [savingResult, setSavingResult] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}`)
    if (r.ok) { const d = await r.json(); setTournament(d.tournament) }
    setLoading(false)
  }, [businessId, tournamentId])

  useEffect(() => { load() }, [load])

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim()) return
    setAddSaving(true)
    const players = addPlayers ? addPlayers.split(",").map(s => s.trim()).filter(Boolean).map(name => ({ name })) : []
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName.trim(), players }),
    })
    if (r.ok) {
      toast.success("Participante agregado")
      setAddName(""); setAddPlayers("")
      load()
    } else {
      const d = await r.json(); toast.error(d.error || "Error al agregar")
    }
    setAddSaving(false)
  }

  async function handleRemoveParticipant(id: string) {
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/participants/${id}`, { method: "DELETE" })
    if (r.ok) { toast.success("Participante eliminado"); load() }
  }

  async function handleGenerateFixture() {
    if (!confirm("¿Generar fixture? Esto reemplazará los partidos existentes.")) return
    setGenerating(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/generate-fixture`, { method: "POST" })
    if (r.ok) {
      toast.success("Fixture generado")
      load()
      setTab("fixture")
    } else {
      const d = await r.json(); toast.error(d.error || "Error al generar")
    }
    setGenerating(false)
  }

  async function handleSaveResult() {
    if (!resultMatch || !winnerId) { toast.error("Selecciona el ganador"); return }
    setSavingResult(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/matches/${resultMatch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score1, score2, winnerId, status: "FINISHED" }),
    })
    if (r.ok) {
      toast.success("Resultado guardado")
      setResultMatch(null); setScore1(""); setScore2(""); setWinnerId("")
      load()
    } else {
      const d = await r.json(); toast.error(d.error || "Error")
    }
    setSavingResult(false)
  }

  async function handleChangeStatus(status: string) {
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (r.ok) { toast.success("Estado actualizado"); load() }
  }

  if (loading) return <div className="text-center py-16 text-sm" style={{ color: "rgba(13,27,42,0.3)" }}>Cargando…</div>
  if (!tournament) return <div className="text-center py-16 text-sm" style={{ color: "rgba(13,27,42,0.3)" }}>No encontrado</div>

  const participants = tournament.participants
  const matches = tournament.matches
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  const roundNames = (r: number, total: number) => {
    if (tournament.format === "ROUND_ROBIN") return `Partido ${r}`
    const left = total - r + 1
    if (left === 1) return "Final"
    if (left === 2) return "Semifinales"
    if (left === 3) return "Cuartos de final"
    return `Ronda ${r}`
  }
  const totalRounds = rounds.length

  const inputCls = "rounded-xl px-3 py-2 text-sm outline-none transition-all"
  const inputStyle = { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }

  // Round Robin standings
  const standings = participants.map(p => {
    const played = matches.filter(m => m.status === "FINISHED" && (m.participant1?.id === p.id || m.participant2?.id === p.id))
    const wins = played.filter(m => m.winner?.id === p.id).length
    const losses = played.length - wins
    return { participant: p, played: played.length, wins, losses, points: wins * 3 }
  }).sort((a, b) => b.points - a.points || b.wins - a.wins)

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="mt-1 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={{ border: "1px solid rgba(201,168,76,0.3)", color: GOLD }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.08)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-black uppercase tracking-wide" style={{ color: NAVY }}>{tournament.name}</h1>
            {tournament.sport && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.12)", color: GOLD }}>{tournament.sport}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.45)" }}>{FORMAT_LABELS[tournament.format]}</span>
            <span style={{ color: "rgba(13,27,42,0.2)" }}>·</span>
            <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.45)" }}>{TYPE_LABELS[tournament.participantType]}</span>
            <span style={{ color: "rgba(13,27,42,0.2)" }}>·</span>
            <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.45)" }}>
              {format(new Date(tournament.startDate), "d MMM", { locale: es })} – {format(new Date(tournament.endDate), "d MMM yyyy", { locale: es })}
            </span>
            {tournament.entryFee && <>
              <span style={{ color: "rgba(13,27,42,0.2)" }}>·</span>
              <span className="text-xs font-semibold" style={{ color: GOLD }}>{fmt(Number(tournament.entryFee))} inscripción</span>
            </>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {tournament.status === "OPEN" && participants.length >= 2 && (
            <button onClick={handleGenerateFixture} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.4)", color: "#16a34a" }}>
              <Play className="w-3.5 h-3.5" /> {generating ? "Generando…" : "Generar fixture"}
            </button>
          )}
          {tournament.status === "IN_PROGRESS" && (
            <button onClick={() => handleChangeStatus("FINISHED")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all"
              style={{ background: "rgba(201,168,76,0.1)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
              <Trophy className="w-3.5 h-3.5" /> Finalizar
            </button>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Participantes", value: `${participants.length}${tournament.maxParticipants ? `/${tournament.maxParticipants}` : ""}` },
          { label: "Partidos", value: matches.length },
          { label: "Estado", value: STATUS_LABELS[tournament.status] },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 text-center" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
            <p className="text-lg font-black" style={{ color: NAVY }}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-wide font-semibold mt-0.5" style={{ color: "rgba(13,27,42,0.35)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)" }}>
        {(["participants", "fixture"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
            style={tab === t ? { background: "#fff", color: GOLD, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "rgba(13,27,42,0.4)" }}>
            {t === "participants" ? `Inscritos (${participants.length})` : "Fixture"}
          </button>
        ))}
      </div>

      {/* PARTICIPANTS TAB */}
      {tab === "participants" && (
        <div className="space-y-3">
          {/* Add form */}
          {tournament.status === "OPEN" && (
            <form onSubmit={handleAddParticipant} className="rounded-2xl p-4 space-y-3"
              style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.4)" }}>
                Agregar {TYPE_LABELS[tournament.participantType].toLowerCase()}
              </p>
              <div className="flex gap-2">
                <input value={addName} onChange={e => setAddName(e.target.value)}
                  placeholder={tournament.participantType === "INDIVIDUAL" ? "Nombre del jugador" : tournament.participantType === "PAIR" ? "Nombre de la pareja" : "Nombre del equipo"}
                  className={`flex-1 ${inputCls}`} style={inputStyle} />
                {tournament.participantType !== "INDIVIDUAL" && (
                  <input value={addPlayers} onChange={e => setAddPlayers(e.target.value)}
                    placeholder={tournament.participantType === "PAIR" ? "Jugador 1, Jugador 2" : "Jugadores separados por coma"}
                    className={`flex-1 ${inputCls}`} style={inputStyle} />
                )}
                <button type="submit" disabled={addSaving || !addName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-40"
                  style={{ background: NAVY, color: GOLD }}>
                  <UserPlus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </form>
          )}

          {/* Participants list */}
          {participants.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ border: "1px dashed rgba(201,168,76,0.25)" }}>
              <p className="text-sm" style={{ color: "rgba(13,27,42,0.35)" }}>Aún no hay inscritos</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
              {participants.map((p, i) => {
                const playerList = Array.isArray(p.players) ? (p.players as { name: string }[]).map(pl => pl.name).join(", ") : ""
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < participants.length - 1 ? "1px solid rgba(201,168,76,0.1)" : "none" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ background: NAVY }}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{p.name}</p>
                      {playerList && <p className="text-[11px] truncate" style={{ color: "rgba(13,27,42,0.4)" }}>{playerList}</p>}
                    </div>
                    {p.status === "CHAMPION" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.2)", color: GOLD }}>
                        🏆 Campeón
                      </span>
                    )}
                    {tournament.status === "OPEN" && (
                      <button onClick={() => handleRemoveParticipant(p.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: "#ef4444" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* FIXTURE TAB */}
      {tab === "fixture" && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ border: "1px dashed rgba(201,168,76,0.25)" }}>
              <p className="text-sm font-bold" style={{ color: "rgba(13,27,42,0.35)" }}>
                {tournament.status === "OPEN" && participants.length >= 2
                  ? "Presiona "Generar fixture" para crear los partidos"
                  : "Sin partidos generados aún"}
              </p>
            </div>
          ) : (
            <>
              {/* Round Robin standings */}
              {tournament.format === "ROUND_ROBIN" && matches.some(m => m.status === "FINISHED") && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: `1px solid rgba(201,168,76,0.2)` }}>
                  <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.06)" }}>
                    <p className="text-xs font-black uppercase tracking-wide" style={{ color: NAVY }}>Tabla de posiciones</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
                    <div className="grid grid-cols-5 px-4 py-2">
                      {["Pos", "Nombre", "PJ", "G", "Pts"].map(h => (
                        <p key={h} className="text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: "rgba(13,27,42,0.35)" }}>{h}</p>
                      ))}
                    </div>
                    {standings.map((s, i) => (
                      <div key={s.participant.id} className="grid grid-cols-5 px-4 py-2.5 items-center">
                        <p className="text-sm font-black text-center" style={{ color: i === 0 ? GOLD : "rgba(13,27,42,0.4)" }}>{i + 1}</p>
                        <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{s.participant.name}</p>
                        <p className="text-sm text-center" style={{ color: "rgba(13,27,42,0.5)" }}>{s.played}</p>
                        <p className="text-sm text-center" style={{ color: "rgba(13,27,42,0.5)" }}>{s.wins}</p>
                        <p className="text-sm font-black text-center" style={{ color: GOLD }}>{s.points}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matches by round */}
              {rounds.map(r => (
                <div key={r}>
                  <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: GOLD }}>
                    {roundNames(r, totalRounds)}
                  </p>
                  <div className="space-y-2">
                    {matches.filter(m => m.round === r).map(m => {
                      const hasBye = !m.participant1 || !m.participant2
                      const isFinished = m.status === "FINISHED"
                      return (
                        <div key={m.id} className="rounded-xl overflow-hidden"
                          style={{ background: "#fff", border: `1px solid ${isFinished ? "rgba(201,168,76,0.25)" : "rgba(13,27,42,0.1)"}` }}>
                          <div className="flex items-stretch">
                            {/* P1 */}
                            <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5"
                              style={{ background: m.winner?.id === m.participant1?.id ? "rgba(201,168,76,0.08)" : "transparent" }}>
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                style={{ background: m.participant1 ? NAVY : "rgba(13,27,42,0.1)" }}>
                                {m.participant1 ? m.participant1.name[0] : "?"}
                              </div>
                              <p className="text-sm font-bold truncate" style={{ color: m.participant1 ? NAVY : "rgba(13,27,42,0.25)" }}>
                                {m.participant1?.name ?? "Por definir"}
                              </p>
                              {m.winner?.id === m.participant1?.id && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />}
                            </div>

                            {/* Scores */}
                            <div className="flex items-center gap-1 px-3 flex-shrink-0"
                              style={{ borderLeft: "1px solid rgba(13,27,42,0.07)", borderRight: "1px solid rgba(13,27,42,0.07)" }}>
                              {isFinished ? (
                                <p className="text-sm font-black" style={{ color: NAVY }}>
                                  {m.score1 ?? "–"} <span style={{ color: "rgba(13,27,42,0.2)" }}>vs</span> {m.score2 ?? "–"}
                                </p>
                              ) : (
                                <p className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.25)" }}>vs</p>
                              )}
                            </div>

                            {/* P2 */}
                            <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 justify-end"
                              style={{ background: m.winner?.id === m.participant2?.id ? "rgba(201,168,76,0.08)" : "transparent" }}>
                              {m.winner?.id === m.participant2?.id && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />}
                              <p className="text-sm font-bold truncate text-right" style={{ color: m.participant2 ? NAVY : "rgba(13,27,42,0.25)" }}>
                                {m.participant2?.name ?? (hasBye && m.participant1 ? "BYE" : "Por definir")}
                              </p>
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                style={{ background: m.participant2 ? NAVY : "rgba(13,27,42,0.1)" }}>
                                {m.participant2 ? m.participant2.name[0] : "?"}
                              </div>
                            </div>

                            {/* Action */}
                            {!hasBye && !isFinished && tournament.status === "IN_PROGRESS" && m.participant1 && m.participant2 && (
                              <button onClick={() => { setResultMatch(m); setScore1(""); setScore2(""); setWinnerId("") }}
                                className="px-3 flex items-center justify-center flex-shrink-0 transition-all"
                                style={{ borderLeft: "1px solid rgba(13,27,42,0.07)", color: GOLD }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.06)" }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Result modal */}
      {resultMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.3)" }}>
            <div className="flex items-center justify-between">
              <p className="font-black text-sm uppercase tracking-wide" style={{ color: NAVY }}>Cargar resultado</p>
              <button onClick={() => setResultMatch(null)} className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(13,27,42,0.06)" }}>
                <X className="w-3.5 h-3.5" style={{ color: "rgba(13,27,42,0.5)" }} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input value={score1} onChange={e => setScore1(e.target.value)} placeholder="0"
                className="flex-1 rounded-xl px-3 py-2 text-center text-lg font-black outline-none"
                style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }} />
              <span className="text-sm font-bold" style={{ color: "rgba(13,27,42,0.3)" }}>vs</span>
              <input value={score2} onChange={e => setScore2(e.target.value)} placeholder="0"
                className="flex-1 rounded-xl px-3 py-2 text-center text-lg font-black outline-none"
                style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }} />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(13,27,42,0.4)" }}>Ganador *</p>
              <div className="grid grid-cols-2 gap-2">
                {[resultMatch.participant1, resultMatch.participant2].filter(Boolean).map(p => (
                  <button key={p!.id} type="button" onClick={() => setWinnerId(p!.id)}
                    className="rounded-xl py-2.5 px-3 text-sm font-bold transition-all truncate"
                    style={winnerId === p!.id
                      ? { background: "rgba(201,168,76,0.12)", border: `1.5px solid ${GOLD}`, color: "#8a6520" }
                      : { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.1)", color: "rgba(13,27,42,0.5)" }}>
                    {p!.name}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSaveResult} disabled={savingResult || !winnerId}
              className="w-full h-10 rounded-xl text-sm font-black uppercase tracking-wide transition-all disabled:opacity-40"
              style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
              {savingResult ? "Guardando…" : "Guardar resultado"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
