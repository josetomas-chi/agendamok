"use client"
import React, { useState, useEffect, useCallback } from "react"
import { ArrowLeft, UserPlus, Play, Trophy, X, Check, ChevronRight, Swords } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"

const FORMAT_LABELS = { ELIMINATION: "Eliminación directa", ROUND_ROBIN: "Round Robin", GROUP_STAGE: "Fase de grupos" }
const TYPE_LABELS = { INDIVIDUAL: "Individual", PAIR: "Parejas", TEAM: "Equipos" }
const STATUS_LABELS = { DRAFT: "Borrador", OPEN: "Inscripciones abiertas", IN_PROGRESS: "En curso", FINISHED: "Finalizado" }

type Participant = { id: string; name: string; players: { name: string }[]; seed: number | null; status: string; group: string | null }
type Match = {
  id: string; round: number; matchNumber: number; status: string; stage: string; group: string | null
  score1: string | null; score2: string | null
  participant1: Participant | null; participant2: Participant | null; winner: Participant | null
}
type Tournament = {
  id: string; name: string; sport: string | null
  format: "ELIMINATION" | "ROUND_ROBIN" | "GROUP_STAGE"
  participantType: "INDIVIDUAL" | "PAIR" | "TEAM"
  startDate: string; endDate: string; maxParticipants: number | null
  entryFee: string | null; status: "DRAFT" | "OPEN" | "IN_PROGRESS" | "FINISHED"
  description: string | null; groupCount: number | null; advanceCount: number | null
  participants: Participant[]; matches: Match[]
}

function fmt(n: number) { return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }) }

function groupStandings(participants: Participant[], matches: Match[]) {
  return participants.map(p => {
    const played = matches.filter(m => m.status === "FINISHED" && (m.participant1?.id === p.id || m.participant2?.id === p.id))
    const wins = played.filter(m => m.winner?.id === p.id).length
    const draws = 0
    const losses = played.length - wins
    const gf = played.reduce((s, m) => s + (parseInt((m.participant1?.id === p.id ? m.score1 : m.score2) ?? "0") || 0), 0)
    const ga = played.reduce((s, m) => s + (parseInt((m.participant1?.id === p.id ? m.score2 : m.score1) ?? "0") || 0), 0)
    return { participant: p, played: played.length, wins, draws, losses, gf, ga, gd: gf - ga, points: wins * 3 }
  }).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
}

export default function TournamentDetail({ businessId, tournamentId, onBack }: {
  businessId: string; tournamentId: string; onBack: () => void
}) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"participants" | "groups" | "fixture">("participants")
  const [addName, setAddName] = useState("")
  const [addPlayers, setAddPlayers] = useState("")
  const [addSaving, setAddSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [advancing, setAdvancing] = useState(false)
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

  // Auto-switch to groups tab if GROUP_STAGE in progress
  useEffect(() => {
    if (tournament?.format === "GROUP_STAGE" && tournament.status === "IN_PROGRESS") {
      setTab("groups")
    }
  }, [tournament?.format, tournament?.status])

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
    if (r.ok) { toast.success("Participante agregado"); setAddName(""); setAddPlayers(""); load() }
    else { const d = await r.json(); toast.error(d.error || "Error al agregar") }
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
    if (r.ok) { toast.success("Fixture generado"); load(); setTab(tournament?.format === "GROUP_STAGE" ? "groups" : "fixture") }
    else { const d = await r.json(); toast.error(d.error || "Error al generar") }
    setGenerating(false)
  }

  async function handleAdvanceToKnockout() {
    if (!confirm("¿Avanzar clasificados a llaves? Esto generará el bracket de eliminación.")) return
    setAdvancing(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/advance-to-knockout`, { method: "POST" })
    if (r.ok) { toast.success("Llaves generadas"); load(); setTab("fixture") }
    else { const d = await r.json(); toast.error(d.error || "Error") }
    setAdvancing(false)
  }

  async function handleSaveResult() {
    if (!resultMatch || !winnerId) { toast.error("Selecciona el ganador"); return }
    setSavingResult(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/matches/${resultMatch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score1, score2, winnerId, status: "FINISHED" }),
    })
    if (r.ok) { toast.success("Resultado guardado"); setResultMatch(null); setScore1(""); setScore2(""); setWinnerId(""); load() }
    else { const d = await r.json(); toast.error(d.error || "Error") }
    setSavingResult(false)
  }

  async function handleChangeStatus(status: string) {
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (r.ok) { toast.success("Estado actualizado"); load() }
  }

  if (loading) return <div className="text-center py-16 text-sm" style={{ color: "rgba(13,27,42,0.3)" }}>Cargando…</div>
  if (!tournament) return <div className="text-center py-16 text-sm" style={{ color: "rgba(13,27,42,0.3)" }}>No encontrado</div>

  const participants = tournament.participants
  const matches = tournament.matches
  const groupMatches = matches.filter(m => m.stage === "GROUP")
  const knockoutMatches = matches.filter(m => m.stage === "KNOCKOUT")
  const knockoutRounds = [...new Set(knockoutMatches.map(m => m.round))].sort((a, b) => a - b)
  const totalKnockoutRounds = knockoutRounds.length
  const groupLetters = [...new Set(participants.map(p => p.group).filter(Boolean))].sort() as string[]
  const isGroupStage = tournament.format === "GROUP_STAGE"
  const groupStageComplete = isGroupStage && groupMatches.length > 0 && groupMatches.every(m => m.status === "FINISHED")
  const hasKnockout = knockoutMatches.length > 0

  const roundName = (r: number, total: number) => {
    const left = total - r + 1
    if (left === 1) return "Final"
    if (left === 2) return "Semifinales"
    if (left === 3) return "Cuartos de final"
    return `Ronda ${r}`
  }

  // Round Robin standings (non-group-stage)
  const rrStandings = groupStandings(participants, matches.filter(m => m.status === "FINISHED"))

  const inputStyle = { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }
  const inputCls = "rounded-xl px-3 py-2 text-sm outline-none transition-all"

  const tabs = [
    { key: "participants", label: `Inscritos (${participants.length})` },
    ...(isGroupStage ? [{ key: "groups", label: "Grupos" }] : []),
    { key: "fixture", label: isGroupStage ? "Llaves" : "Fixture" },
  ] as { key: typeof tab; label: string }[]

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
            {isGroupStage && tournament.groupCount && (
              <><span style={{ color: "rgba(13,27,42,0.2)" }}>·</span>
              <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.45)" }}>{tournament.groupCount} grupos · Top {tournament.advanceCount} clasifican</span></>
            )}
            <span style={{ color: "rgba(13,27,42,0.2)" }}>·</span>
            <span className="text-xs font-semibold" style={{ color: "rgba(13,27,42,0.45)" }}>{TYPE_LABELS[tournament.participantType]}</span>
            {tournament.entryFee && <>
              <span style={{ color: "rgba(13,27,42,0.2)" }}>·</span>
              <span className="text-xs font-semibold" style={{ color: GOLD }}>{fmt(Number(tournament.entryFee))}</span>
            </>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {tournament.status === "OPEN" && participants.length >= 2 && (
            <button onClick={handleGenerateFixture} disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.4)", color: "#16a34a" }}>
              <Play className="w-3.5 h-3.5" /> {generating ? "Generando…" : isGroupStage ? "Sortear grupos" : "Generar fixture"}
            </button>
          )}
          {isGroupStage && groupStageComplete && !hasKnockout && tournament.status === "IN_PROGRESS" && (
            <button onClick={handleAdvanceToKnockout} disabled={advancing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
              style={{ background: "rgba(201,168,76,0.12)", border: `1px solid ${GOLD}`, color: "#8a6520" }}>
              <Swords className="w-3.5 h-3.5" /> {advancing ? "Generando…" : "Avanzar a llaves"}
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
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
            style={tab === t.key ? { background: "#fff", color: GOLD, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "rgba(13,27,42,0.4)" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PARTICIPANTS TAB ── */}
      {tab === "participants" && (
        <div className="space-y-3">
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
          {participants.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ border: "1px dashed rgba(201,168,76,0.25)" }}>
              <p className="text-sm" style={{ color: "rgba(13,27,42,0.35)" }}>Aún no hay inscritos</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
              {participants.map((p, i) => {
                const playerList = (p.players as { name: string }[]).map(pl => pl.name).join(", ")
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < participants.length - 1 ? "1px solid rgba(201,168,76,0.1)" : "none" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ background: NAVY }}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{p.name}</p>
                      {playerList && <p className="text-[11px] truncate" style={{ color: "rgba(13,27,42,0.4)" }}>{playerList}</p>}
                    </div>
                    {p.group && (
                      <span className="text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(201,168,76,0.15)", color: GOLD }}>
                        {p.group}
                      </span>
                    )}
                    {p.status === "CHAMPION" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.2)", color: GOLD }}>🏆 Campeón</span>
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

      {/* ── GROUPS TAB ── */}
      {tab === "groups" && isGroupStage && (
        <div className="space-y-4">
          {groupLetters.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ border: "1px dashed rgba(201,168,76,0.25)" }}>
              <p className="text-sm font-bold" style={{ color: "rgba(13,27,42,0.35)" }}>
                {tournament.status === "OPEN" ? "Presiona "Sortear grupos" para asignar participantes" : "Sin grupos generados"}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {groupLetters.map(letter => {
                const gParticipants = participants.filter(p => p.group === letter)
                const gMatches = groupMatches.filter(m => m.group === letter)
                const standings = groupStandings(gParticipants, gMatches.filter(m => m.status === "FINISHED"))
                const advCount = tournament.advanceCount ?? 2

                return (
                  <div key={letter} className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
                    {/* Group header */}
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.06)" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                        style={{ background: NAVY }}>
                        {letter}
                      </div>
                      <p className="font-black text-xs uppercase tracking-wide" style={{ color: NAVY }}>Grupo {letter}</p>
                      <span className="text-[10px] ml-auto" style={{ color: "rgba(13,27,42,0.35)" }}>{gParticipants.length} participantes</span>
                    </div>

                    {/* Standings table */}
                    <div className="divide-y" style={{ borderColor: "rgba(201,168,76,0.08)" }}>
                      <div className="grid px-3 py-1.5" style={{ gridTemplateColumns: "1fr auto auto auto auto auto" }}>
                        {["", "PJ", "G", "P", "DG", "Pts"].map(h => (
                          <p key={h} className="text-[9px] font-bold uppercase tracking-wide text-center last:text-right" style={{ color: "rgba(13,27,42,0.3)" }}>{h}</p>
                        ))}
                      </div>
                      {standings.map((s, idx) => (
                        <div key={s.participant.id} className="grid items-center px-3 py-2"
                          style={{ gridTemplateColumns: "1fr auto auto auto auto auto", background: idx < advCount ? "rgba(34,197,94,0.04)" : "transparent" }}>
                          <div className="flex items-center gap-2 min-w-0">
                            {idx < advCount && <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />}
                            {idx >= advCount && <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: "rgba(13,27,42,0.1)" }} />}
                            <p className="text-xs font-bold truncate" style={{ color: NAVY }}>{s.participant.name}</p>
                          </div>
                          {[s.played, s.wins, s.losses, s.gd > 0 ? `+${s.gd}` : s.gd].map((v, i) => (
                            <p key={i} className="text-xs text-center" style={{ color: "rgba(13,27,42,0.5)" }}>{v}</p>
                          ))}
                          <p className="text-xs font-black text-right" style={{ color: GOLD }}>{s.points}</p>
                        </div>
                      ))}
                    </div>

                    {/* Group matches */}
                    {gMatches.length > 0 && (
                      <div style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
                        {gMatches.map(m => (
                          <MatchRow key={m.id} match={m} canEdit={tournament.status === "IN_PROGRESS"}
                            onEdit={() => { setResultMatch(m); setScore1(m.score1 ?? ""); setScore2(m.score2 ?? ""); setWinnerId(m.winner?.id ?? "") }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {groupStageComplete && !hasKnockout && (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(201,168,76,0.08)", border: `1px solid ${GOLD}` }}>
              <Trophy className="w-5 h-5 flex-shrink-0" style={{ color: GOLD }} />
              <div className="flex-1">
                <p className="text-sm font-black" style={{ color: NAVY }}>¡Fase de grupos completada!</p>
                <p className="text-xs" style={{ color: "rgba(13,27,42,0.5)" }}>Presiona "Avanzar a llaves" para generar el bracket de eliminación con los clasificados.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FIXTURE / KNOCKOUT TAB ── */}
      {tab === "fixture" && (
        <div className="space-y-4">
          {/* Round Robin standings */}
          {tournament.format === "ROUND_ROBIN" && matches.some(m => m.status === "FINISHED") && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.06)" }}>
                <p className="text-xs font-black uppercase tracking-wide" style={{ color: NAVY }}>Tabla de posiciones</p>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
                <div className="grid grid-cols-5 px-4 py-2">
                  {["Pos", "Nombre", "PJ", "G", "Pts"].map(h => (
                    <p key={h} className="text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: "rgba(13,27,42,0.35)" }}>{h}</p>
                  ))}
                </div>
                {rrStandings.map((s, i) => (
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

          {knockoutMatches.length === 0 && tournament.format !== "ROUND_ROBIN" ? (
            <div className="rounded-2xl p-12 text-center" style={{ border: "1px dashed rgba(201,168,76,0.25)" }}>
              <p className="text-sm font-bold" style={{ color: "rgba(13,27,42,0.35)" }}>
                {isGroupStage
                  ? "Las llaves aparecerán aquí una vez que la fase de grupos esté completa"
                  : tournament.status === "OPEN" && participants.length >= 2
                    ? "Presiona "Generar fixture" para crear los partidos"
                    : "Sin partidos generados aún"}
              </p>
            </div>
          ) : (
            <>
              {(tournament.format === "ROUND_ROBIN" ? [1] : knockoutRounds).map(r => (
                <div key={r}>
                  {tournament.format !== "ROUND_ROBIN" && (
                    <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: GOLD }}>
                      {roundName(r, totalKnockoutRounds)}
                    </p>
                  )}
                  <div className="space-y-2">
                    {(tournament.format === "ROUND_ROBIN" ? matches : knockoutMatches.filter(m => m.round === r)).map(m => (
                      <MatchRow key={m.id} match={m} canEdit={tournament.status === "IN_PROGRESS"}
                        onEdit={() => { setResultMatch(m); setScore1(m.score1 ?? ""); setScore2(m.score2 ?? ""); setWinnerId(m.winner?.id ?? "") }} />
                    ))}
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
            <div className="text-center mb-1">
              <p className="text-xs font-bold" style={{ color: "rgba(13,27,42,0.5)" }}>
                {resultMatch.participant1?.name} <span style={{ color: "rgba(13,27,42,0.25)" }}>vs</span> {resultMatch.participant2?.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input value={score1} onChange={e => setScore1(e.target.value)} placeholder="0"
                className="flex-1 rounded-xl px-3 py-2 text-center text-lg font-black outline-none"
                style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }} />
              <span className="text-sm font-bold" style={{ color: "rgba(13,27,42,0.3)" }}>–</span>
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

function MatchRow({ match: m, canEdit, onEdit }: { match: Match; canEdit: boolean; onEdit: () => void }) {
  const hasBye = !m.participant1 || !m.participant2
  const isFinished = m.status === "FINISHED"
  return (
    <div className="flex items-stretch" style={{ borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
      <div className="flex-1 flex items-center gap-2 px-3 py-2.5"
        style={{ background: m.winner?.id === m.participant1?.id ? "rgba(201,168,76,0.06)" : "transparent" }}>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
          style={{ background: m.participant1 ? NAVY : "rgba(13,27,42,0.1)" }}>
          {m.participant1 ? m.participant1.name[0] : "?"}
        </div>
        <p className="text-xs font-bold truncate" style={{ color: m.participant1 ? NAVY : "rgba(13,27,42,0.25)" }}>
          {m.participant1?.name ?? "Por definir"}
        </p>
        {m.winner?.id === m.participant1?.id && <Check className="w-3 h-3 flex-shrink-0" style={{ color: GOLD }} />}
      </div>
      <div className="flex items-center gap-1 px-2 flex-shrink-0"
        style={{ borderLeft: "1px solid rgba(13,27,42,0.07)", borderRight: "1px solid rgba(13,27,42,0.07)" }}>
        {isFinished
          ? <p className="text-xs font-black whitespace-nowrap" style={{ color: NAVY }}>{m.score1 ?? "–"} – {m.score2 ?? "–"}</p>
          : <p className="text-[10px] font-semibold" style={{ color: "rgba(13,27,42,0.25)" }}>vs</p>}
      </div>
      <div className="flex-1 flex items-center gap-2 px-3 py-2.5 justify-end"
        style={{ background: m.winner?.id === m.participant2?.id ? "rgba(201,168,76,0.06)" : "transparent" }}>
        {m.winner?.id === m.participant2?.id && <Check className="w-3 h-3 flex-shrink-0" style={{ color: GOLD }} />}
        <p className="text-xs font-bold truncate text-right" style={{ color: m.participant2 ? NAVY : "rgba(13,27,42,0.25)" }}>
          {m.participant2?.name ?? (hasBye && m.participant1 ? "BYE" : "Por definir")}
        </p>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
          style={{ background: m.participant2 ? NAVY : "rgba(13,27,42,0.1)" }}>
          {m.participant2 ? m.participant2.name[0] : "?"}
        </div>
      </div>
      {!hasBye && !isFinished && canEdit && m.participant1 && m.participant2 && (
        <button onClick={onEdit} className="px-3 flex items-center justify-center flex-shrink-0 transition-all"
          style={{ borderLeft: "1px solid rgba(13,27,42,0.07)", color: GOLD }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.06)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
