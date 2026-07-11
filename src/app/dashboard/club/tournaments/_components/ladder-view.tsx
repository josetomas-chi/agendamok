"use client"

import { useState, useEffect, useCallback } from "react"
import { Trophy, Swords, GripVertical, Check, X, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"

type Participant = {
  id: string
  name: string
  players: { name: string }[]
  ladderPosition: number | null
  status: string
}

type Challenge = {
  id: string
  status: string
  scheduledTime: string | null
  score1: string | null
  score2: string | null
  sets: { s1: number; s2: number }[] | null
  participant1: Participant | null  // challenger
  participant2: Participant | null  // defender
  winner: Participant | null
}

export function LadderView({ businessId, tournamentId, participantType, tournamentStatus, categoryId, endDate }: {
  businessId: string
  tournamentId: string
  participantType: "INDIVIDUAL" | "PAIR" | "TEAM"
  tournamentStatus: string
  categoryId: string | null
  endDate: string
}) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [localOrder, setLocalOrder] = useState<Participant[]>([])

  // Challenge modal
  const [newChallenge, setNewChallenge] = useState(false)
  const [challengerId, setChallengerId] = useState("")
  const [defenderId, setDefenderId] = useState("")
  const [challengeTime, setChallengeTime] = useState("")
  const [savingChallenge, setSavingChallenge] = useState(false)

  // Result modal
  const [resultChallenge, setResultChallenge] = useState<Challenge | null>(null)
  const [sets, setSets] = useState<{ s1: string; s2: string }[]>([{ s1: "", s2: "" }])
  const [winnerId, setWinnerId] = useState("")
  const [savingResult, setSavingResult] = useState(false)

  function autoDetectWinner(newSets: { s1: string; s2: string }[], challenge: Challenge) {
    const w1 = newSets.filter(s => Number(s.s1) > Number(s.s2)).length
    const w2 = newSets.filter(s => Number(s.s2) > Number(s.s1)).length
    if (w1 > w2 && challenge.participant1) setWinnerId(challenge.participant1.id)
    else if (w2 > w1 && challenge.participant2) setWinnerId(challenge.participant2.id)
  }

  const load = useCallback(async () => {
    const qs = categoryId ? `?categoryId=${categoryId}` : ""
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/ladder${qs}`)
    if (r.ok) {
      const d = await r.json()
      const sorted = [...d.participants].sort((a: Participant, b: Participant) =>
        (a.ladderPosition ?? 9999) - (b.ladderPosition ?? 9999)
      )
      setParticipants(sorted)
      setLocalOrder(sorted)
      setChallenges(d.challenges)
    }
    setLoading(false)
  }, [businessId, tournamentId, categoryId])

  useEffect(() => { load() }, [load])

  function displayName(p: Participant) {
    if (participantType === "INDIVIDUAL") return p.name
    const pl = p.players as { name: string }[]
    return pl.length >= 2 ? `${pl[0].name} / ${pl[1].name}` : p.name
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = [...localOrder]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setLocalOrder(next)
  }

  function moveDown(idx: number) {
    if (idx === localOrder.length - 1) return
    const next = [...localOrder]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setLocalOrder(next)
  }

  async function saveOrder() {
    setReordering(true)
    const reorder = localOrder.map((p, i) => ({ id: p.id, ladderPosition: i + 1 }))
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/ladder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder }),
    })
    if (r.ok) { toast.success("Orden guardado"); await load() }
    else toast.error("Error al guardar")
    setReordering(false)
  }

  const orderChanged = localOrder.some((p, i) => p.id !== participants[i]?.id)

  async function createChallenge(e: React.FormEvent) {
    e.preventDefault()
    if (!challengerId || !defenderId) return
    setSavingChallenge(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/ladder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengerId, defenderId, scheduledTime: challengeTime || null, categoryId }),
    })
    if (r.ok) {
      toast.success("Desafío creado")
      setNewChallenge(false)
      setChallengerId(""); setDefenderId(""); setChallengeTime("")
      await load()
    } else {
      const d = await r.json()
      toast.error(d.error ?? "Error al crear desafío")
    }
    setSavingChallenge(false)
  }

  async function saveResult(e: React.FormEvent) {
    e.preventDefault()
    if (!resultChallenge || !winnerId) return
    const validSets = sets.filter(s => s.s1 !== "" && s.s2 !== "").map(s => ({ s1: Number(s.s1), s2: Number(s.s2) }))
    setSavingResult(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/ladder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: resultChallenge.id,
        winnerId,
        score: validSets.length > 0 ? null : null,
        sets: validSets.length > 0 ? validSets : null,
      }),
    })
    if (r.ok) {
      toast.success("Resultado registrado")
      setResultChallenge(null)
      setSets([{ s1: "", s2: "" }]); setWinnerId("")
      await load()
    } else toast.error("Error al guardar resultado")
    setSavingResult(false)
  }

  const inputStyle = { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }
  const inputCls = "rounded-xl px-3 py-2 text-sm outline-none w-full"
  const labelCls = "text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5 block"

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
    </div>
  )

  const pending = challenges.filter(c => c.status === "PENDING")
  const finished = challenges.filter(c => c.status === "FINISHED")

  return (
    <div className="space-y-6">
      {/* Ranking */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(13,27,42,0.08)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(13,27,42,0.03)", borderBottom: "1px solid rgba(13,27,42,0.06)" }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(13,27,42,0.4)" }}>
              Escalerilla — {localOrder.length} participantes
            </span>
            {endDate && (() => {
              const end = new Date(endDate)
              const now = new Date()
              const expired = end < now
              return (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: expired ? "rgba(239,68,68,0.08)" : "rgba(201,168,76,0.1)",
                    color: expired ? "#ef4444" : GOLD,
                    border: `1px solid ${expired ? "rgba(239,68,68,0.2)" : "rgba(201,168,76,0.25)"}`,
                  }}>
                  {expired ? "Venció" : "Vigente hasta"} {format(end, "d MMM yyyy", { locale: es })}
                </span>
              )
            })()}
          </div>
          <div className="flex items-center gap-2">
            {orderChanged && (
              <button
                onClick={saveOrder}
                disabled={reordering}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: GOLD, color: NAVY }}
              >
                {reordering ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Guardar orden
              </button>
            )}
            {tournamentStatus === "IN_PROGRESS" && (
              <button
                onClick={() => setNewChallenge(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(201,168,76,0.1)", color: GOLD, border: "1px solid rgba(201,168,76,0.2)" }}
              >
                <Swords className="w-3 h-3" /> Nuevo desafío
              </button>
            )}
          </div>
        </div>

        {localOrder.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "rgba(13,27,42,0.35)" }}>
            Sin participantes inscritos
          </div>
        ) : (
          <div>
            {localOrder.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  borderBottom: idx < localOrder.length - 1 ? "1px solid rgba(13,27,42,0.05)" : undefined,
                  background: idx === 0 ? "rgba(201,168,76,0.04)" : undefined,
                }}
              >
                {/* Position */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                  style={{
                    background: idx === 0 ? GOLD : idx === 1 ? "rgba(13,27,42,0.08)" : "rgba(13,27,42,0.04)",
                    color: idx === 0 ? NAVY : "rgba(13,27,42,0.4)",
                  }}>
                  {idx === 0 ? <Trophy className="w-3.5 h-3.5" /> : idx + 1}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{displayName(p)}</p>
                  {participantType === "PAIR" && (p.players as { name: string }[]).length >= 2 && (
                    <p className="text-[11px] truncate" style={{ color: "rgba(13,27,42,0.4)" }}>Pareja</p>
                  )}
                </div>

                {/* Move buttons */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveUp(idx)} disabled={idx === 0}
                    className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-20 transition-opacity"
                    style={{ color: "rgba(13,27,42,0.4)" }}>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveDown(idx)} disabled={idx === localOrder.length - 1}
                    className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-20 transition-opacity"
                    style={{ color: "rgba(13,27,42,0.4)" }}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desafíos pendientes */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(13,27,42,0.35)" }}>
            Desafíos pendientes ({pending.length})
          </h3>
          {pending.map(c => (
            <div key={c.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(13,27,42,0.03)", border: "1px solid rgba(13,27,42,0.08)" }}>
              <Swords className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: NAVY }}>
                  {c.participant1 ? displayName(c.participant1) : "?"} <span style={{ color: "rgba(13,27,42,0.3)" }}>reta a</span> {c.participant2 ? displayName(c.participant2) : "?"}
                </p>
                {c.scheduledTime && (
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(13,27,42,0.4)" }}>
                    {format(new Date(c.scheduledTime), "d MMM · HH:mm", { locale: es })}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setResultChallenge(c); setWinnerId(c.winner?.id ?? ""); setSets(c.sets?.length ? c.sets.map(s => ({ s1: String(s.s1), s2: String(s.s2) })) : [{ s1: "", s2: "" }]) }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                style={{ background: "rgba(201,168,76,0.1)", color: GOLD, border: "1px solid rgba(201,168,76,0.2)" }}
              >
                Resultado
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Historial */}
      {finished.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(13,27,42,0.35)" }}>
            Historial ({finished.length})
          </h3>
          {finished.map(c => (
            <div key={c.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(13,27,42,0.02)", border: "1px solid rgba(13,27,42,0.06)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: NAVY }}>
                  <span className={c.winner?.id === c.participant1?.id ? "font-bold" : ""}>{c.participant1 ? displayName(c.participant1) : "?"}</span>
                  <span style={{ color: "rgba(13,27,42,0.3)" }}> vs </span>
                  <span className={c.winner?.id === c.participant2?.id ? "font-bold" : ""}>{c.participant2 ? displayName(c.participant2) : "?"}</span>
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(13,27,42,0.4)" }}>
                  Ganó: {c.winner ? displayName(c.winner) : "—"}
                  {c.sets?.length ? ` · ${c.sets.map(s => `${s.s1}-${s.s2}`).join(", ")}` : (c.score1 !== null && c.score2 !== null ? ` · ${c.score1}-${c.score2}` : "")}
                </p>
              </div>
              {c.winner?.id === c.participant1?.id && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.12)", color: GOLD }}>
                  subió
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nuevo desafío */}
      {newChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: "#fff" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base" style={{ color: NAVY }}>Nuevo desafío</h3>
              <button onClick={() => setNewChallenge(false)}><X className="w-4 h-4" style={{ color: "rgba(13,27,42,0.4)" }} /></button>
            </div>
            <form onSubmit={createChallenge} className="space-y-3">
              <div>
                <label className={labelCls} style={{ color: "rgba(13,27,42,0.5)" }}>Retador (posición inferior)</label>
                <select value={challengerId} onChange={e => setChallengerId(e.target.value)} required className={inputCls} style={inputStyle}>
                  <option value="">Seleccionar…</option>
                  {participants.map((p, i) => (
                    <option key={p.id} value={p.id}>{i + 1}. {displayName(p)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: "rgba(13,27,42,0.5)" }}>Defensor (posición superior)</label>
                <select value={defenderId} onChange={e => setDefenderId(e.target.value)} required className={inputCls} style={inputStyle}>
                  <option value="">Seleccionar…</option>
                  {participants.filter(p => p.id !== challengerId).map((p, i) => {
                    const pos = participants.findIndex(x => x.id === p.id)
                    return <option key={p.id} value={p.id}>{pos + 1}. {displayName(p)}</option>
                  })}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: "rgba(13,27,42,0.5)" }}>Fecha y hora (opcional)</label>
                <input type="datetime-local" value={challengeTime} onChange={e => setChallengeTime(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setNewChallenge(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(13,27,42,0.06)", color: NAVY }}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingChallenge} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{ background: GOLD, color: NAVY }}>
                  {savingChallenge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                  Crear desafío
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resultado */}
      {resultChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: "#fff" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base" style={{ color: NAVY }}>Registrar resultado</h3>
              <button onClick={() => setResultChallenge(null)}><X className="w-4 h-4" style={{ color: "rgba(13,27,42,0.4)" }} /></button>
            </div>
            <div className="text-sm text-center py-2 rounded-xl" style={{ background: "rgba(13,27,42,0.04)", color: "rgba(13,27,42,0.6)" }}>
              {resultChallenge.participant1 ? displayName(resultChallenge.participant1) : "?"} <span style={{ color: GOLD, fontWeight: 700 }}>vs</span> {resultChallenge.participant2 ? displayName(resultChallenge.participant2) : "?"}
            </div>
            <form onSubmit={saveResult} className="space-y-3">
              {/* Entrada por sets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls} style={{ color: "rgba(13,27,42,0.5)" }}>Sets</label>
                  <button type="button" onClick={() => setSets(p => [...p, { s1: "", s2: "" }])} className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: "rgba(201,168,76,0.1)", color: GOLD }}>+ Set</button>
                </div>
                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-x-1 gap-y-1 items-center mb-1">
                  <div /><p className="text-[10px] text-center font-semibold truncate" style={{ color: "rgba(13,27,42,0.4)" }}>{resultChallenge.participant1 ? displayName(resultChallenge.participant1) : "Retador"}</p>
                  <div /><p className="text-[10px] text-center font-semibold truncate" style={{ color: "rgba(13,27,42,0.4)" }}>{resultChallenge.participant2 ? displayName(resultChallenge.participant2) : "Defensor"}</p>
                  <div />
                </div>
                {sets.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-x-1 gap-y-1 items-center mb-1">
                    <span className="text-[10px] font-semibold w-5 text-right" style={{ color: "rgba(13,27,42,0.3)" }}>{idx + 1}</span>
                    <input type="number" min="0" max="99" value={s.s1} placeholder="0"
                      onChange={e => { const n = sets.map((x, i) => i === idx ? { ...x, s1: e.target.value } : x); setSets(n); autoDetectWinner(n, resultChallenge) }}
                      className="rounded-xl px-2 py-2 text-center text-base font-black outline-none"
                      style={{ background: Number(s.s1) > Number(s.s2) ? "rgba(201,168,76,0.1)" : "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }} />
                    <span className="text-center text-xs font-bold w-4" style={{ color: "rgba(13,27,42,0.25)" }}>–</span>
                    <input type="number" min="0" max="99" value={s.s2} placeholder="0"
                      onChange={e => { const n = sets.map((x, i) => i === idx ? { ...x, s2: e.target.value } : x); setSets(n); autoDetectWinner(n, resultChallenge) }}
                      className="rounded-xl px-2 py-2 text-center text-base font-black outline-none"
                      style={{ background: Number(s.s2) > Number(s.s1) ? "rgba(201,168,76,0.1)" : "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }} />
                    {sets.length > 1 && <button type="button" onClick={() => setSets(p => p.filter((_, i) => i !== idx))}><X className="w-3 h-3" style={{ color: "rgba(13,27,42,0.3)" }} /></button>}
                    {sets.length === 1 && <div className="w-3" />}
                  </div>
                ))}
              </div>
              <div>
                <label className={labelCls} style={{ color: "rgba(13,27,42,0.5)" }}>Ganador</label>
                <div className="flex gap-2">
                  {[resultChallenge.participant1, resultChallenge.participant2].filter(Boolean).map(p => (
                    <button
                      key={p!.id}
                      type="button"
                      onClick={() => setWinnerId(p!.id)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: winnerId === p!.id ? GOLD : "rgba(13,27,42,0.06)",
                        color: winnerId === p!.id ? NAVY : "rgba(13,27,42,0.6)",
                        border: winnerId === p!.id ? `2px solid ${GOLD}` : "2px solid transparent",
                      }}
                    >
                      {displayName(p!)}
                    </button>
                  ))}
                </div>
              </div>
              {winnerId === resultChallenge.participant1?.id && (
                <p className="text-[11px] text-center font-semibold" style={{ color: GOLD }}>
                  ↑ El retador sube al lugar del defensor
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setResultChallenge(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(13,27,42,0.06)", color: NAVY }}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingResult || !winnerId} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: GOLD, color: NAVY }}>
                  {savingResult ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
