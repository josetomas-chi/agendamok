"use client"

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"

type SetScore = { s1: number; s2: number }
type Participant = { id: string; name: string; players: { name: string }[] }
type Match = {
  id: string; status: string
  sets: SetScore[] | null
  score1: string | null; score2: string | null
  participant1: Participant | null
  participant2: Participant | null
  winner: Participant | null
}

function calcStats(participant: Participant, matches: Match[]) {
  const played = matches.filter(
    m => m.status === "FINISHED" && (m.participant1?.id === participant.id || m.participant2?.id === participant.id)
  )
  let wins = 0, losses = 0, setsW = 0, setsL = 0, gamesW = 0, gamesL = 0

  for (const m of played) {
    const isP1 = m.participant1?.id === participant.id
    const won = m.winner?.id === participant.id
    won ? wins++ : losses++

    if (m.sets?.length) {
      for (const s of m.sets) {
        const myGames = isP1 ? s.s1 : s.s2
        const opGames = isP1 ? s.s2 : s.s1
        gamesW += myGames
        gamesL += opGames
        if (myGames > opGames) setsW++
        else if (opGames > myGames) setsL++
      }
    } else {
      // Fallback a score1/score2 si no hay sets
      const myScore = parseInt((isP1 ? m.score1 : m.score2) ?? "0") || 0
      const opScore = parseInt((isP1 ? m.score2 : m.score1) ?? "0") || 0
      setsW += myScore
      setsL += opScore
    }
  }

  const totalGames = gamesW + gamesL
  const gamesPct = totalGames > 0 ? Math.round((gamesW / totalGames) * 100) : null

  return { played: played.length, wins, losses, setsW, setsL, gamesW, gamesL, gamesPct }
}

export function StatsView({
  participants, matches, participantType,
}: {
  participants: Participant[]
  matches: Match[]
  participantType: "INDIVIDUAL" | "PAIR" | "TEAM"
}) {
  const rows = participants
    .map(p => ({ participant: p, ...calcStats(p, matches) }))
    .filter(r => r.played > 0)
    .sort((a, b) => b.wins - a.wins || b.setsW - a.setsW || b.gamesW - a.gamesW)

  function displayName(p: Participant) {
    if (participantType !== "PAIR") return p.name
    const pl = p.players as { name: string }[]
    return pl.length >= 2 ? `${pl[0].name} / ${pl[1].name}` : p.name
  }

  if (rows.length === 0) return (
    <div className="text-center py-12 text-sm" style={{ color: "rgba(13,27,42,0.35)" }}>
      Sin partidos finalizados aún
    </div>
  )

  const cols = [
    { key: "name",     label: "Jugador",  tip: null },
    { key: "played",   label: "PJ",       tip: "Partidos jugados" },
    { key: "wins",     label: "PG",       tip: "Partidos ganados" },
    { key: "losses",   label: "PP",       tip: "Partidos perdidos" },
    { key: "setsW",    label: "SG",       tip: "Sets ganados" },
    { key: "setsL",    label: "SP",       tip: "Sets perdidos" },
    { key: "gamesW",   label: "JG",       tip: "Juegos ganados" },
    { key: "gamesL",   label: "JP",       tip: "Juegos perdidos" },
    { key: "gamesPct", label: "%J",       tip: "% juegos ganados" },
  ]

  return (
    <div className="space-y-4">
      {/* Leyenda */}
      <div className="flex flex-wrap gap-3">
        {cols.filter(c => c.tip).map(c => (
          <span key={c.key} className="text-[10px]" style={{ color: "rgba(13,27,42,0.4)" }}>
            <span className="font-bold" style={{ color: "rgba(13,27,42,0.6)" }}>{c.label}</span> {c.tip}
          </span>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(13,27,42,0.08)" }}>
        {/* Header */}
        <div className="grid text-[10px] font-bold uppercase tracking-wider px-3 py-2"
          style={{
            gridTemplateColumns: "1fr repeat(8, 2.5rem)",
            background: "rgba(13,27,42,0.03)",
            borderBottom: "1px solid rgba(13,27,42,0.06)",
            color: "rgba(13,27,42,0.4)",
          }}>
          <span>Jugador</span>
          {cols.slice(1).map(c => (
            <span key={c.key} className="text-center">{c.label}</span>
          ))}
        </div>

        {rows.map((r, idx) => (
          <div
            key={r.participant.id}
            className="grid items-center px-3 py-3"
            style={{
              gridTemplateColumns: "1fr repeat(8, 2.5rem)",
              borderBottom: idx < rows.length - 1 ? "1px solid rgba(13,27,42,0.05)" : undefined,
              background: idx === 0 ? "rgba(201,168,76,0.03)" : undefined,
            }}
          >
            {/* Nombre */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-black w-5 text-center flex-shrink-0"
                style={{ color: idx === 0 ? GOLD : "rgba(13,27,42,0.25)" }}>
                {idx + 1}
              </span>
              <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>
                {displayName(r.participant)}
              </p>
            </div>

            {/* PJ */}
            <span className="text-xs text-center font-medium" style={{ color: "rgba(13,27,42,0.5)" }}>{r.played}</span>

            {/* PG */}
            <span className="text-xs text-center font-bold" style={{ color: r.wins > 0 ? "#16a34a" : "rgba(13,27,42,0.3)" }}>{r.wins}</span>

            {/* PP */}
            <span className="text-xs text-center font-medium" style={{ color: r.losses > 0 ? "#dc2626" : "rgba(13,27,42,0.3)" }}>{r.losses}</span>

            {/* SG */}
            <span className="text-xs text-center font-semibold" style={{ color: NAVY }}>{r.setsW}</span>

            {/* SP */}
            <span className="text-xs text-center font-semibold" style={{ color: "rgba(13,27,42,0.4)" }}>{r.setsL}</span>

            {/* JG */}
            <span className="text-xs text-center font-semibold" style={{ color: NAVY }}>{r.gamesW}</span>

            {/* JP */}
            <span className="text-xs text-center font-semibold" style={{ color: "rgba(13,27,42,0.4)" }}>{r.gamesL}</span>

            {/* %J */}
            <span className="text-xs text-center font-bold"
              style={{ color: r.gamesPct !== null && r.gamesPct >= 50 ? GOLD : "rgba(13,27,42,0.4)" }}>
              {r.gamesPct !== null ? `${r.gamesPct}%` : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Líderes */}
      {rows.length >= 2 && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {[
            { label: "Más victorias", value: rows[0].wins, name: displayName(rows[0].participant), suffix: "PG" },
            {
              label: "Mejor % juegos",
              value: [...rows].sort((a, b) => (b.gamesPct ?? 0) - (a.gamesPct ?? 0))[0].gamesPct,
              name: displayName([...rows].sort((a, b) => (b.gamesPct ?? 0) - (a.gamesPct ?? 0))[0].participant),
              suffix: "%",
            },
          ].map(card => (
            <div key={card.label} className="rounded-2xl p-4" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.4)" }}>{card.label}</p>
              <p className="text-base font-black truncate" style={{ color: NAVY }}>{card.name}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: GOLD }}>{card.value}{card.suffix}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
