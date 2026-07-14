"use client"
import React, { useState, useEffect, useCallback } from "react"
import { ArrowLeft, UserPlus, Play, Trophy, X, Check, ChevronRight, Swords, Tag, Plus, Pencil, Link2, ImagePlus, Loader2, GripVertical, RefreshCw, CalendarDays, List } from "lucide-react"
import { LadderView } from "./ladder-view"
import { StatsView } from "./stats-view"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DndContext, DragEndEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"

const FORMAT_LABELS = { ELIMINATION: "Eliminación directa", ROUND_ROBIN: "Round Robin", GROUP_STAGE: "Fase de grupos", LADDER: "Escalerilla" }
const TYPE_LABELS = { INDIVIDUAL: "Individual", PAIR: "Parejas", TEAM: "Equipos" }
const STATUS_LABELS = { DRAFT: "Borrador", OPEN: "Inscripciones abiertas", IN_PROGRESS: "En curso", FINISHED: "Finalizado" }

type Category = { id: string; name: string; description: string | null; groupCount?: number | null; groupSize?: number | null }
type Participant = { id: string; name: string; players: { name: string }[]; seed: number | null; status: string; group: string | null; categoryId: string | null; restrictions?: { date: string; time: string }[] }
type Match = {
  id: string; round: number; matchNumber: number; status: string; stage: string; group: string | null; categoryId: string | null
  score1: string | null; score2: string | null; sets: { s1: number; s2: number }[] | null; courtNumber: number | null; scheduledTime: string | null
  participant1: Participant | null; participant2: Participant | null; winner: Participant | null
}
type Tournament = {
  id: string; name: string; sport: string | null
  format: "ELIMINATION" | "ROUND_ROBIN" | "GROUP_STAGE" | "LADDER"
  participantType: "INDIVIDUAL" | "PAIR" | "TEAM"
  startDate: string; endDate: string; registrationDeadline: string | null; maxParticipants: number | null
  entryFee: string | null; status: "DRAFT" | "OPEN" | "IN_PROGRESS" | "FINISHED"
  description: string | null; groupCount: number | null; advanceCount: number | null; courtCount: number | null
  flyer: string | null
  categories: Category[]; participants: Participant[]; matches: Match[]
  scheduleDays: { id: string; date: string; startTime: string; endTime: string; allowRestrictions: boolean }[]
}

function fmt(n: number) { return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }) }

function calcStandings(participants: Participant[], matches: Match[]) {
  return participants.map(p => {
    const played = matches.filter(m => m.status === "FINISHED" && (m.participant1?.id === p.id || m.participant2?.id === p.id))
    const wins = played.filter(m => m.winner?.id === p.id).length
    const losses = played.length - wins
    const gf = played.reduce((s, m) => s + (parseInt((m.participant1?.id === p.id ? m.score1 : m.score2) ?? "0") || 0), 0)
    const ga = played.reduce((s, m) => s + (parseInt((m.participant1?.id === p.id ? m.score2 : m.score1) ?? "0") || 0), 0)
    return { participant: p, played: played.length, wins, losses, gf, ga, gd: gf - ga, points: wins * 3 }
  }).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
}

export default function TournamentDetail({ businessId, tournamentId, onBack }: {
  businessId: string; tournamentId: string; onBack: () => void
}) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"participants" | "groups" | "fixture" | "ladder" | "stats">("participants")
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  // Participant add
  const [addName, setAddName] = useState("")
  const [addSaving, setAddSaving] = useState(false)
  // PAIR
  const [addP1Name, setAddP1Name] = useState("")
  const [addP1Phone, setAddP1Phone] = useState("")
  const [addP2Name, setAddP2Name] = useState("")
  const [addP2Phone, setAddP2Phone] = useState("")
  // TEAM
  const [addTeamPhone, setAddTeamPhone] = useState("")
  const [addTeamPlayers, setAddTeamPlayers] = useState<string[]>(["", ""])

  // Category management
  const [catOpen, setCatOpen] = useState(false)
  const [catName, setCatName] = useState("")
  const [catDesc, setCatDesc] = useState("")
  const [catSaving, setCatSaving] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)

  // Flyer upload
  const [uploadingFlyer, setUploadingFlyer] = useState(false)

  // Fixture
  const [generating, setGenerating] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [regenSaving, setRegenSaving] = useState(false)
  const [fixtureView, setFixtureView] = useState<"list" | "calendar">("list")
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [swapping, setSwapping] = useState(false)

  // Result
  const [resultMatch, setResultMatch] = useState<Match | null>(null)
  const [sets, setSets] = useState<{ s1: string; s2: string }[]>([{ s1: "", s2: "" }])
  const [winnerId, setWinnerId] = useState("")
  const [editCourt, setEditCourt] = useState("")
  const [editTime, setEditTime] = useState("")
  const [savingResult, setSavingResult] = useState(false)

  function openResultModal(match: Match) {
    setResultMatch(match)
    setWinnerId(match.winner?.id ?? "")
    setSets(match.sets?.length ? match.sets.map(s => ({ s1: String(s.s1), s2: String(s.s2) })) : [{ s1: "", s2: "" }])
    setEditCourt(match.courtNumber ? String(match.courtNumber) : "")
    setEditTime(match.scheduledTime ? new Date(match.scheduledTime).toISOString().slice(0, 16) : "")
  }

  function updateSet(idx: number, key: "s1" | "s2", val: string) {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s))
  }

  function addSet() { setSets(prev => [...prev, { s1: "", s2: "" }]) }
  function removeSet(idx: number) { setSets(prev => prev.filter((_, i) => i !== idx)) }

  // Derivar ganador automáticamente según sets ganados
  function autoDetectWinner(newSets: { s1: string; s2: string }[], match: Match) {
    const setsP1 = newSets.filter(s => Number(s.s1) > Number(s.s2)).length
    const setsP2 = newSets.filter(s => Number(s.s2) > Number(s.s1)).length
    if (setsP1 > setsP2 && match.participant1) setWinnerId(match.participant1.id)
    else if (setsP2 > setsP1 && match.participant2) setWinnerId(match.participant2.id)
  }

  const load = useCallback(async () => {
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}`)
    if (r.ok) {
      const d = await r.json()
      setTournament(d.tournament)
      // auto-select first category if none selected
      if (d.tournament.categories?.length > 0 && activeCategoryId === null) {
        setActiveCategoryId(d.tournament.categories[0].id)
      }
    }
    setLoading(false)
  }, [businessId, tournamentId, activeCategoryId])

  useEffect(() => { load() }, [businessId, tournamentId]) // eslint-disable-line

  useEffect(() => {
    if (tournament?.format === "GROUP_STAGE" && tournament.status === "IN_PROGRESS") setTab("groups")
  }, [tournament?.format, tournament?.status])

  const hasCategories = (tournament?.categories?.length ?? 0) > 0

  // Filter by active category (null = no categories = show all)
  function filterByCategory<T extends { categoryId: string | null }>(items: T[]): T[] {
    if (!hasCategories) return items
    if (activeCategoryId === null) return items
    return items.filter(i => i.categoryId === activeCategoryId)
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!catName.trim()) return
    setCatSaving(true)
    if (editCat) {
      const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/categories/${editCat.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName, description: catDesc }),
      })
      if (r.ok) { toast.success("Categoría actualizada"); setCatOpen(false); setEditCat(null); setCatName(""); setCatDesc(""); load() }
      else toast.error("Error al actualizar")
    } else {
      const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/categories`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName, description: catDesc }),
      })
      if (r.ok) {
        const d = await r.json()
        toast.success("Categoría creada")
        setCatOpen(false); setCatName(""); setCatDesc("")
        setActiveCategoryId(d.category.id)
        load()
      } else toast.error("Error al crear")
    }
    setCatSaving(false)
  }

  async function handleDeleteCategory(cat: Category) {
    if (!confirm(`¿Eliminar categoría "${cat.name}"? Se eliminarán sus participantes y partidos.`)) return
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/categories/${cat.id}`, { method: "DELETE" })
    if (r.ok) {
      toast.success("Categoría eliminada")
      if (activeCategoryId === cat.id) setActiveCategoryId(tournament?.categories.find(c => c.id !== cat.id)?.id ?? null)
      load()
    }
  }

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault()
    const pType = tournament?.participantType
    setAddSaving(true)

    let name = "", phone = "", players: { name: string; phone?: string }[] = []

    if (pType === "INDIVIDUAL") {
      if (!addName.trim()) { setAddSaving(false); return }
      name = addName.trim()
    } else if (pType === "PAIR") {
      if (!addP1Name.trim() || !addP2Name.trim()) { toast.error("Completa el nombre de ambos jugadores"); setAddSaving(false); return }
      name = `${addP1Name.trim()} / ${addP2Name.trim()}`
      phone = addP1Phone.trim()
      players = [
        { name: addP1Name.trim(), phone: addP1Phone.trim() },
        { name: addP2Name.trim(), phone: addP2Phone.trim() },
      ]
    } else {
      if (!addName.trim()) { setAddSaving(false); return }
      name = addName.trim()
      phone = addTeamPhone.trim()
      players = addTeamPlayers.map(p => p.trim()).filter(Boolean).map(n => ({ name: n }))
    }

    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/participants`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, players, categoryId: activeCategoryId }),
    })
    if (r.ok) {
      toast.success("Participante agregado")
      setAddName(""); setAddP1Name(""); setAddP1Phone(""); setAddP2Name(""); setAddP2Phone("")
      setAddTeamPhone(""); setAddTeamPlayers(["", ""])
      load()
    } else { const d = await r.json(); toast.error(d.error || "Error") }
    setAddSaving(false)
  }

  async function handleUpdateGroup(participantId: string, group: string) {
    await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/participants/${participantId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group: group || null }),
    })
    load()
  }

  async function handleRemoveParticipant(id: string) {
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/participants/${id}`, { method: "DELETE" })
    if (r.ok) { toast.success("Eliminado"); load() }
  }

  async function handleGenerateFixture() {
    if (!confirm("¿Generar fixture? Esto reemplazará los partidos existentes para esta categoría.")) return
    setGenerating(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/generate-fixture`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: activeCategoryId }),
    })
    if (r.ok) { toast.success("Fixture generado"); load(); setTab(tournament?.format === "GROUP_STAGE" ? "groups" : "fixture") }
    else { const d = await r.json(); toast.error(d.error || "Error") }
    setGenerating(false)
  }

  async function handleAdvanceToKnockout() {
    if (!confirm("¿Avanzar clasificados a llaves?")) return
    setAdvancing(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/advance-to-knockout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: activeCategoryId }),
    })
    if (r.ok) { toast.success("Llaves generadas"); load(); setTab("fixture") }
    else { const d = await r.json(); toast.error(d.error || "Error") }
    setAdvancing(false)
  }

  async function handleSaveResult() {
    if (!resultMatch || !winnerId) { toast.error("Selecciona el ganador"); return }
    const validSets = sets.filter(s => s.s1 !== "" && s.s2 !== "").map(s => ({ s1: Number(s.s1), s2: Number(s.s2) }))
    const setsP1 = validSets.filter(s => s.s1 > s.s2).length
    const setsP2 = validSets.filter(s => s.s2 > s.s1).length
    setSavingResult(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/matches/${resultMatch.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sets: validSets.length > 0 ? validSets : null,
        score1: validSets.length > 0 ? String(setsP1) : null,
        score2: validSets.length > 0 ? String(setsP2) : null,
        winnerId, status: "FINISHED",
        courtNumber: editCourt ? Number(editCourt) : null,
        scheduledTime: editTime || null,
      }),
    })
    if (r.ok) { toast.success("Resultado guardado"); setResultMatch(null); setSets([{ s1: "", s2: "" }]); setWinnerId(""); setEditCourt(""); setEditTime(""); load() }
    else { const d = await r.json(); toast.error(d.error || "Error") }
    setSavingResult(false)
  }

  async function handleSaveSchedule(match: Match) {
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/matches/${match.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courtNumber: editCourt ? Number(editCourt) : null,
        scheduledTime: editTime || null,
      }),
    })
    if (r.ok) { toast.success("Horario actualizado"); setResultMatch(null); setEditCourt(""); setEditTime(""); load() }
    else toast.error("Error al guardar")
  }

  async function handlePartialRegen() {
    const hasFinished = matches.some(m => m.status === "FINISHED" || m.winner !== null)
    const msg = hasFinished
      ? "¿Regenerar fixture? Los partidos ya jugados se conservarán, solo se redistribuirán los pendientes."
      : "¿Regenerar fixture? Se reemplazarán todos los partidos."
    if (!confirm(msg)) return
    setRegenSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/generate-fixture`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: activeCategoryId, preserveFinished: hasFinished }),
    })
    if (r.ok) { toast.success("Fixture regenerado"); load() }
    else { const d = await r.json(); toast.error(d.error || "Error") }
    setRegenSaving(false)
  }

  async function handleMoveMatch(matchId: string, isoTime: string, court: number) {
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/matches/${matchId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledTime: isoTime, courtNumber: court }),
    })
    if (r.ok) { toast.success("Partido movido"); setSelectedMatchId(null); load() }
    else toast.error("Error al mover partido")
  }

  async function handleSwapMatches(matchAId: string, matchBId: string) {
    setSwapping(true)
    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournamentId}/matches/swap`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchAId, matchBId }),
    })
    if (r.ok) { toast.success("Partidos intercambiados"); load() }
    else toast.error("Error al intercambiar")
    setSwapping(false)
  }

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    handleSwapMatches(String(active.id), String(over.id))
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

  const categories = tournament.categories
  const allParticipants = tournament.participants
  const allMatches = tournament.matches

  // Filtered by active category
  const participants = filterByCategory(allParticipants)
  const matches = filterByCategory(allMatches)
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

  const inputStyle = { background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }
  const inputCls = "rounded-xl px-3 py-2 text-sm outline-none transition-all"
  const labelCls = "text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5 block"

  const isLadder = tournament.format === "LADDER"

  const finishedMatches = matches.filter(m => m.status === "FINISHED")

  const tabs = [
    { key: "participants", label: `Inscritos (${participants.length})` },
    ...(isGroupStage ? [{ key: "groups", label: "Grupos" }] : []),
    ...(!isLadder ? [{ key: "fixture", label: isGroupStage ? "Llaves" : "Fixture" }] : []),
    ...(isLadder ? [{ key: "ladder", label: "Escalerilla" }] : []),
    ...(finishedMatches.length > 0 ? [{ key: "stats", label: "Estadísticas" }] : []),
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
          {/* Flyer upload */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer"
            style={{ background: tournament.flyer ? "rgba(201,168,76,0.15)" : "rgba(13,27,42,0.06)", border: `1px solid ${tournament.flyer ? "rgba(201,168,76,0.4)" : "rgba(13,27,42,0.15)"}`, color: tournament.flyer ? GOLD : "rgba(13,27,42,0.45)" }}
            title={tournament.flyer ? "Cambiar flyer para WhatsApp" : "Subir flyer para previsualización en WhatsApp"}>
            {uploadingFlyer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {tournament.flyer ? "Flyer ✓" : "Subir flyer"}
            <input type="file" accept="image/*" className="hidden" disabled={uploadingFlyer}
              onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploadingFlyer(true)
                const fd = new FormData()
                fd.append("file", file)
                const r = await fetch("/api/upload", { method: "POST", body: fd })
                const d = await r.json()
                if (!r.ok) { toast.error(d.error || "Error al subir"); setUploadingFlyer(false); return }
                await fetch(`/api/businesses/${businessId}/tournaments/${tournament.id}`, {
                  method: "PATCH", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ flyer: d.url }),
                })
                setTournament(t => t ? { ...t, flyer: d.url } : t)
                toast.success("Flyer guardado — la previsualización de WhatsApp se actualizará")
                setUploadingFlyer(false)
              }} />
          </label>
          {tournament.status === "OPEN" && (
            <button onClick={() => {
              const url = `${window.location.origin}/torneos/${tournament.id}`
              navigator.clipboard.writeText(url).then(() => toast.success("Link copiado"))
            }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all"
              style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", color: GOLD }}>
              <Link2 className="w-3.5 h-3.5" /> Link inscripción
            </button>
          )}
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
          {tournament.status === "IN_PROGRESS" && matches.length > 0 && (
            <button onClick={handlePartialRegen} disabled={regenSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
              style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.35)", color: "#1d4ed8" }}>
              <RefreshCw className="w-3.5 h-3.5" /> {regenSaving ? "Regenerando…" : "Regenerar fixture"}
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
          { label: "Inscritos", value: `${allParticipants.length}${tournament.maxParticipants ? `/${tournament.maxParticipants}` : ""}` },
          { label: "Canchas", value: tournament.courtCount ?? "–" },
          { label: "Estado", value: STATUS_LABELS[tournament.status] },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3 text-center" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
            <p className="text-lg font-black" style={{ color: NAVY }}>{s.value}</p>
            <p className="text-[10px] uppercase tracking-wide font-semibold mt-0.5" style={{ color: "rgba(13,27,42,0.35)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Fechas del torneo — editables inline */}
      <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: "rgba(13,27,42,0.35)" }}>Fecha de inicio</p>
            <input
              type="date"
              defaultValue={tournament.startDate.split("T")[0]}
              className="w-full rounded-xl px-3 py-2 text-sm font-bold outline-none"
              style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }}
              onChange={async e => {
                const val = e.target.value
                if (!val) return
                const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournament.id}`, {
                  method: "PATCH", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ startDate: `${val}T00:00:00`, endDate: `${val}T23:59:00` }),
                })
                if (r.ok) { setTournament(t => t ? { ...t, startDate: `${val}T00:00:00.000Z`, endDate: `${val}T23:59:00.000Z` } : t); toast.success("Fecha actualizada") }
                else toast.error("Error al actualizar fecha")
              }}
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide font-semibold mb-1" style={{ color: "rgba(13,27,42,0.35)" }}>Fecha de término</p>
            <input
              type="date"
              defaultValue={tournament.endDate.split("T")[0]}
              className="w-full rounded-xl px-3 py-2 text-sm font-bold outline-none"
              style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }}
              onChange={async e => {
                const val = e.target.value
                if (!val) return
                const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournament.id}`, {
                  method: "PATCH", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ endDate: `${val}T23:59:00` }),
                })
                if (r.ok) { setTournament(t => t ? { ...t, endDate: `${val}T23:59:00.000Z` } : t); toast.success("Fecha de término actualizada") }
                else toast.error("Error al actualizar fecha")
              }}
            />
          </div>
        </div>
      </div>

      {/* Fecha límite de inscripción — editable inline */}
      <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "rgba(13,27,42,0.35)" }}>Fecha límite de inscripción</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: NAVY }}>
            {tournament.registrationDeadline
              ? new Date(tournament.registrationDeadline).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })
              : <span style={{ color: "rgba(13,27,42,0.3)" }}>Sin fecha límite</span>}
          </p>
        </div>
        <input
          type="date"
          defaultValue={tournament.registrationDeadline ? tournament.registrationDeadline.split("T")[0] : ""}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }}
          onChange={async e => {
            const val = e.target.value
            const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournament.id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ registrationDeadline: val ? `${val}T23:59:00` : null }),
            })
            if (r.ok) {
              setTournament(t => t ? { ...t, registrationDeadline: val ? `${val}T23:59:00.000Z` : null } : t)
              toast.success(val ? "Fecha límite guardada" : "Fecha límite eliminada")
            }
          }}
        />
      </div>

      {/* Jornadas */}
      {tournament.scheduleDays?.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(13,27,42,0.06)" }}>
            <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.4)" }}>Jornadas</p>
            <p className="text-[10px] font-semibold" style={{ color: "rgba(13,27,42,0.3)" }}>Restricciones</p>
          </div>
          {tournament.scheduleDays.map(d => {
            const dateObj = new Date(d.date + "T12:00:00")
            const dayName = dateObj.toLocaleDateString("es-CL", { weekday: "short" })
            const dateStr = dateObj.toLocaleDateString("es-CL", { day: "numeric", month: "short" })
            return (
              <div key={d.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(13,27,42,0.05)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-black uppercase" style={{ color: NAVY }}>{dayName} {dateStr}</span>
                  <span className="text-[11px] font-semibold" style={{ color: GOLD }}>{d.startTime} – {d.endTime}</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const next = !d.allowRestrictions
                    const r = await fetch(`/api/businesses/${businessId}/tournaments/${tournament.id}/schedule-days/${d.id}`, {
                      method: "PATCH", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ allowRestrictions: next }),
                    })
                    if (r.ok) {
                      setTournament(t => t ? {
                        ...t,
                        scheduleDays: t.scheduleDays.map(s => s.id === d.id ? { ...s, allowRestrictions: next } : s)
                      } : t)
                    }
                  }}
                  className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
                  style={{ background: d.allowRestrictions ? GOLD : "rgba(13,27,42,0.15)" }}
                  title={d.allowRestrictions ? "Bloquear restricciones" : "Permitir restricciones"}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ left: d.allowRestrictions ? "calc(100% - 1.125rem)" : "0.125rem" }} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CATEGORIES BAR ── */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <p className="text-xs font-black uppercase tracking-wide" style={{ color: NAVY }}>Categorías</p>
          </div>
          {tournament.status === "OPEN" && (
            <button onClick={() => { setCatOpen(true); setEditCat(null); setCatName(""); setCatDesc("") }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
              style={{ background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.3)`, color: GOLD }}>
              <Plus className="w-3 h-3" /> Agregar
            </button>
          )}
        </div>

        {categories.length === 0 ? (
          <p className="text-xs" style={{ color: "rgba(13,27,42,0.35)" }}>
            Sin categorías — todos los inscritos compiten juntos. Agrega categorías para separar por edad, nivel u otro criterio.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1 group">
                <button onClick={() => setActiveCategoryId(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={activeCategoryId === cat.id
                    ? { background: NAVY, color: GOLD, border: `1.5px solid ${GOLD}` }
                    : { background: "rgba(13,27,42,0.05)", color: "rgba(13,27,42,0.5)", border: "1px solid rgba(13,27,42,0.1)" }}>
                  {cat.name}
                  <span className="text-[10px] opacity-60">
                    {allParticipants.filter(p => p.categoryId === cat.id).length}
                  </span>
                </button>
                {tournament.status === "OPEN" && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditCat(cat); setCatName(cat.name); setCatDesc(cat.description ?? ""); setCatOpen(true) }}
                      className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "rgba(13,27,42,0.35)" }}>
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteCategory(cat)}
                      className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "#ef4444" }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add/edit category inline form */}
        {catOpen && (
          <form onSubmit={handleAddCategory} className="flex gap-2 pt-2" style={{ borderTop: "1px solid rgba(201,168,76,0.15)" }}>
            <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nombre (ej: Sub-12, Open, Principiantes)"
              className={`flex-1 ${inputCls}`} style={inputStyle} autoFocus />
            <input value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Descripción (opcional)"
              className={`flex-1 hidden md:block ${inputCls}`} style={inputStyle} />
            <button type="submit" disabled={catSaving || !catName.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-40"
              style={{ background: NAVY, color: GOLD }}>
              {catSaving ? "…" : editCat ? "Guardar" : "Crear"}
            </button>
            <button type="button" onClick={() => { setCatOpen(false); setEditCat(null) }}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(13,27,42,0.05)", color: "rgba(13,27,42,0.4)" }}>
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
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

      {/* Active category label */}
      {hasCategories && activeCategoryId && (
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5" style={{ color: GOLD }} />
          <p className="text-xs font-bold" style={{ color: NAVY }}>
            {categories.find(c => c.id === activeCategoryId)?.name}
          </p>
          {categories.find(c => c.id === activeCategoryId)?.description && (
            <p className="text-xs" style={{ color: "rgba(13,27,42,0.4)" }}>
              — {categories.find(c => c.id === activeCategoryId)?.description}
            </p>
          )}
        </div>
      )}

      {/* ── PARTICIPANTS TAB ── */}
      {tab === "participants" && (
        <div className="space-y-3">
          {tournament.status === "OPEN" && (
            <form onSubmit={handleAddParticipant} className="rounded-2xl p-4 space-y-3"
              style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.4)" }}>
                Agregar {TYPE_LABELS[tournament.participantType].toLowerCase()}
                {hasCategories && activeCategoryId && ` — ${categories.find(c => c.id === activeCategoryId)?.name}`}
              </p>

              {/* INDIVIDUAL */}
              {tournament.participantType === "INDIVIDUAL" && (
                <div className="flex gap-2">
                  <input value={addName} onChange={e => setAddName(e.target.value)}
                    placeholder="Nombre del jugador"
                    className={`flex-1 ${inputCls}`} style={inputStyle} />
                  <button type="submit" disabled={addSaving || !addName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-40"
                    style={{ background: NAVY, color: GOLD }}>
                    <UserPlus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
              )}

              {/* PAREJA */}
              {tournament.participantType === "PAIR" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: GOLD }}>Jugador 1</p>
                      <input value={addP1Name} onChange={e => setAddP1Name(e.target.value)}
                        placeholder="Nombre completo" className={inputCls} style={inputStyle} />
                      <input value={addP1Phone} onChange={e => setAddP1Phone(e.target.value)}
                        placeholder="WhatsApp" className={inputCls} style={inputStyle} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: GOLD }}>Jugador 2</p>
                      <input value={addP2Name} onChange={e => setAddP2Name(e.target.value)}
                        placeholder="Nombre completo" className={inputCls} style={inputStyle} />
                      <input value={addP2Phone} onChange={e => setAddP2Phone(e.target.value)}
                        placeholder="WhatsApp" className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <button type="submit" disabled={addSaving || !addP1Name.trim() || !addP2Name.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-40"
                    style={{ background: NAVY, color: GOLD }}>
                    <UserPlus className="w-3.5 h-3.5" /> Agregar pareja
                  </button>
                </div>
              )}

              {/* EQUIPO */}
              {tournament.participantType === "TEAM" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={addName} onChange={e => setAddName(e.target.value)}
                      placeholder="Nombre del equipo" className={inputCls} style={inputStyle} />
                    <input value={addTeamPhone} onChange={e => setAddTeamPhone(e.target.value)}
                      placeholder="WhatsApp contacto" className={inputCls} style={inputStyle} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.4)" }}>Integrantes</p>
                    {addTeamPlayers.map((p, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-[10px] w-4 text-center flex-shrink-0" style={{ color: "rgba(13,27,42,0.3)" }}>{i+1}</span>
                        <input value={p} onChange={e => setAddTeamPlayers(pl => pl.map((x,j) => j===i ? e.target.value : x))}
                          placeholder={`Jugador ${i+1}`} className={`flex-1 ${inputCls}`} style={inputStyle} />
                        {addTeamPlayers.length > 2 && (
                          <button type="button" onClick={() => setAddTeamPlayers(pl => pl.filter((_,j) => j!==i))}
                            className="text-red-400 px-1">×</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setAddTeamPlayers(pl => [...pl, ""])}
                      className="text-[10px] font-bold px-3 py-1 rounded-lg"
                      style={{ background: "rgba(13,27,42,0.06)", color: "rgba(13,27,42,0.5)" }}>
                      + Agregar integrante
                    </button>
                  </div>
                  <button type="submit" disabled={addSaving || !addName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-40"
                    style={{ background: NAVY, color: GOLD }}>
                    <UserPlus className="w-3.5 h-3.5" /> Agregar equipo
                  </button>
                </div>
              )}
            </form>
          )}

          {participants.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ border: "1px dashed rgba(201,168,76,0.25)" }}>
              <p className="text-sm" style={{ color: "rgba(13,27,42,0.35)" }}>
                {hasCategories && !activeCategoryId ? "Selecciona una categoría para ver sus inscritos" : "Aún no hay inscritos"}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
              {(() => {
                // Determine available group letters for this category/tournament
                const activeCategory = activeCategoryId ? categories.find(c => c.id === activeCategoryId) : null
                const groupCount = (activeCategory as { groupCount?: number | null } | undefined)?.groupCount ?? tournament.groupCount ?? 0
                const groupLetters = groupCount > 0
                  ? Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i))
                  : ["A","B","C","D","E","F","G","H"]
                const isGroupStage = tournament.format === "GROUP_STAGE"

                return participants.map((p, i) => {
                  const playerList = (p.players as { name: string }[]).map(pl => pl.name).join(", ")
                  const catLabel = !hasCategories ? null : categories.find(c => c.id === p.categoryId)?.name
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < participants.length - 1 ? "1px solid rgba(201,168,76,0.1)" : "none" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: NAVY }}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{p.name}</p>
                        {playerList && <p className="text-[11px] truncate" style={{ color: "rgba(13,27,42,0.4)" }}>{playerList}</p>}
                      </div>
                      {catLabel && activeCategoryId === null && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: "rgba(201,168,76,0.1)", color: GOLD }}>{catLabel}</span>
                      )}
                      {p.restrictions && p.restrictions.length > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          title={p.restrictions.map(r => `${r.date} ${r.time}`).join(", ")}
                          style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                          {p.restrictions.length} bloqueo{p.restrictions.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {/* Grupo editable en torneos fase de grupos */}
                      {isGroupStage && (
                        <select value={p.group ?? ""}
                          onChange={e => handleUpdateGroup(p.id, e.target.value)}
                          className="rounded-lg px-2 py-1 text-xs font-black outline-none cursor-pointer flex-shrink-0"
                          style={{ background: p.group ? "rgba(201,168,76,0.12)" : "rgba(13,27,42,0.05)", border: `1px solid ${p.group ? "rgba(201,168,76,0.4)" : "rgba(13,27,42,0.1)"}`, color: p.group ? GOLD : "rgba(13,27,42,0.35)", minWidth: 56 }}>
                          <option value="">Grupo</option>
                          {groupLetters.map(l => <option key={l} value={l}>Grupo {l}</option>)}
                        </select>
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
                })
              })()}
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
                {tournament.status === "OPEN" ? "Presiona «Sortear grupos» para asignar participantes" : "Sin grupos generados"}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {groupLetters.map(letter => {
                const gParticipants = participants.filter(p => p.group === letter)
                const gMatches = groupMatches.filter(m => m.group === letter)
                const standings = calcStandings(gParticipants, gMatches.filter(m => m.status === "FINISHED"))
                const advCount = tournament.advanceCount ?? 2
                return (
                  <div key={letter} className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.06)" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0" style={{ background: NAVY }}>{letter}</div>
                      <p className="font-black text-xs uppercase tracking-wide" style={{ color: NAVY }}>Grupo {letter}</p>
                      <span className="text-[10px] ml-auto" style={{ color: "rgba(13,27,42,0.35)" }}>{gParticipants.length} participantes</span>
                    </div>
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
                            <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: idx < advCount ? "#22c55e" : "rgba(13,27,42,0.1)" }} />
                            <p className="text-xs font-bold truncate" style={{ color: NAVY }}>{s.participant.name}</p>
                          </div>
                          {[s.played, s.wins, s.losses, s.gd > 0 ? `+${s.gd}` : s.gd].map((v, i) => (
                            <p key={i} className="text-xs text-center" style={{ color: "rgba(13,27,42,0.5)" }}>{v}</p>
                          ))}
                          <p className="text-xs font-black text-right" style={{ color: GOLD }}>{s.points}</p>
                        </div>
                      ))}
                    </div>
                    {gMatches.length > 0 && (
                      <div style={{ borderTop: "1px solid rgba(201,168,76,0.1)" }}>
                        {gMatches.map(m => (
                          <MatchRow key={m.id} match={m} canEdit={tournament.status === "IN_PROGRESS"}
                            onEdit={() => openResultModal(m)} />
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
                <p className="text-xs" style={{ color: "rgba(13,27,42,0.5)" }}>Presiona «Avanzar a llaves» para generar el bracket de eliminación.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FIXTURE / KNOCKOUT TAB ── */}
      {tab === "fixture" && (
        <div className="space-y-4">
          {/* Toolbar: vista + controles */}
          {matches.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.1)" }}>
                <button onClick={() => setFixtureView("list")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
                  style={fixtureView === "list" ? { background: "#fff", color: GOLD, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "rgba(13,27,42,0.4)" }}>
                  <List className="w-3.5 h-3.5" /> Lista
                </button>
                <button onClick={() => { setFixtureView("calendar"); setSelectedMatchId(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
                  style={fixtureView === "calendar" ? { background: "#fff", color: GOLD, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "rgba(13,27,42,0.4)" }}>
                  <CalendarDays className="w-3.5 h-3.5" /> Calendario
                </button>
              </div>
              {fixtureView === "list" && tournament.status === "IN_PROGRESS" && !swapping && (
                <p className="text-[10px]" style={{ color: "rgba(13,27,42,0.35)" }}>⣿ Arrastra los partidos para intercambiar horarios</p>
              )}
              {fixtureView === "calendar" && selectedMatchId && (
                <p className="text-[10px] font-bold" style={{ color: GOLD }}>Selecciona un slot vacío para mover el partido</p>
              )}
              {fixtureView === "calendar" && !selectedMatchId && tournament.status === "IN_PROGRESS" && (
                <p className="text-[10px]" style={{ color: "rgba(13,27,42,0.35)" }}>Toca un partido para seleccionarlo y luego un slot vacío para moverlo</p>
              )}
            </div>
          )}

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
                {calcStandings(participants, matches.filter(m => m.status === "FINISHED")).map((s, i) => (
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
                {isGroupStage ? "Las llaves aparecerán aquí una vez que la fase de grupos esté completa"
                  : tournament.status === "OPEN" && participants.length >= 2 ? "Presiona «Generar fixture» para crear los partidos"
                  : "Sin partidos generados aún"}
              </p>
            </div>
          ) : fixtureView === "calendar" ? (
            <MatchCalendar
              matches={tournament.format === "ROUND_ROBIN" ? matches : knockoutMatches}
              courtCount={tournament.courtCount ?? 1}
              canEdit={tournament.status === "IN_PROGRESS"}
              selectedId={selectedMatchId}
              onSelectMatch={setSelectedMatchId}
              onMoveMatch={handleMoveMatch}
            />
          ) : (
            (tournament.format === "ROUND_ROBIN" ? [1] : knockoutRounds).map(r => {
              const roundMatches = tournament.format === "ROUND_ROBIN" ? matches : knockoutMatches.filter(m => m.round === r)
              const canDrag = tournament.status === "IN_PROGRESS" && !swapping
              return (
                <div key={r}>
                  {tournament.format !== "ROUND_ROBIN" && (
                    <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: GOLD }}>
                      {roundName(r, totalKnockoutRounds)}
                    </p>
                  )}
                  {canDrag ? (
                    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={roundMatches.map(m => m.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {roundMatches.map(m => (
                            <SortableMatchRow key={m.id} match={m} canEdit onEdit={() => openResultModal(m)} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="space-y-2">
                      {roundMatches.map(m => (
                        <MatchRow key={m.id} match={m} canEdit={tournament.status === "IN_PROGRESS"}
                          onEdit={() => openResultModal(m)} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Result modal */}
      {resultMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.3)" }}>
            <div className="flex items-center justify-between">
              <p className="font-black text-sm uppercase tracking-wide" style={{ color: NAVY }}>Partido</p>
              <button onClick={() => { setResultMatch(null); setEditCourt(""); setEditTime("") }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(13,27,42,0.06)" }}>
                <X className="w-3.5 h-3.5" style={{ color: "rgba(13,27,42,0.5)" }} />
              </button>
            </div>
            <p className="text-xs text-center font-bold" style={{ color: "rgba(13,27,42,0.5)" }}>
              {resultMatch.participant1?.name} <span style={{ color: "rgba(13,27,42,0.25)" }}>vs</span> {resultMatch.participant2?.name}
            </p>

            {/* Cancha y horario */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.4)" }}>Cancha</p>
                <input type="number" min="1" value={editCourt} onChange={e => setEditCourt(e.target.value)} placeholder="Nº"
                  className="w-full rounded-xl px-3 py-2 text-sm font-bold outline-none"
                  style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "rgba(13,27,42,0.4)" }}>Fecha y hora</p>
                <input type="datetime-local" value={editTime} onChange={e => setEditTime(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs outline-none"
                  style={{ background: "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }} />
              </div>
            </div>

            {/* Solo guardar horario */}
            {resultMatch.status !== "FINISHED" && (
              <button onClick={() => handleSaveSchedule(resultMatch)}
                className="w-full h-9 rounded-xl text-xs font-bold uppercase tracking-wide transition-all"
                style={{ background: "rgba(13,27,42,0.05)", border: "1px solid rgba(13,27,42,0.12)", color: "rgba(13,27,42,0.5)" }}>
                Guardar solo horario/cancha
              </button>
            )}

            <div style={{ borderTop: "1px solid rgba(13,27,42,0.08)", paddingTop: 8 }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.4)" }}>Sets</p>
                <button type="button" onClick={addSet} className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: "rgba(201,168,76,0.1)", color: GOLD }}>+ Set</button>
              </div>
              {/* Header */}
              <div className="grid grid-cols-[1fr_2rem_1fr_1.5rem] gap-1 mb-1 px-1">
                <p className="text-[10px] font-semibold truncate text-center" style={{ color: "rgba(13,27,42,0.4)" }}>{resultMatch.participant1?.name ?? "J1"}</p>
                <div />
                <p className="text-[10px] font-semibold truncate text-center" style={{ color: "rgba(13,27,42,0.4)" }}>{resultMatch.participant2?.name ?? "J2"}</p>
                <div />
              </div>
              {sets.map((s, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_2rem_1fr_1.5rem] gap-1 mb-1 items-center">
                  <input
                    type="number" min="0" max="99" value={s.s1}
                    onChange={e => {
                      const next = sets.map((x, i) => i === idx ? { ...x, s1: e.target.value } : x)
                      setSets(next)
                      if (resultMatch) autoDetectWinner(next, resultMatch)
                    }}
                    placeholder="0"
                    className="rounded-xl px-2 py-2 text-center text-base font-black outline-none w-full"
                    style={{ background: Number(s.s1) > Number(s.s2) ? "rgba(201,168,76,0.1)" : "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }}
                  />
                  <span className="text-center text-xs font-bold" style={{ color: "rgba(13,27,42,0.25)" }}>–</span>
                  <input
                    type="number" min="0" max="99" value={s.s2}
                    onChange={e => {
                      const next = sets.map((x, i) => i === idx ? { ...x, s2: e.target.value } : x)
                      setSets(next)
                      if (resultMatch) autoDetectWinner(next, resultMatch)
                    }}
                    placeholder="0"
                    className="rounded-xl px-2 py-2 text-center text-base font-black outline-none w-full"
                    style={{ background: Number(s.s2) > Number(s.s1) ? "rgba(201,168,76,0.1)" : "rgba(13,27,42,0.04)", border: "1px solid rgba(13,27,42,0.12)", color: NAVY }}
                  />
                  {sets.length > 1 && (
                    <button type="button" onClick={() => removeSet(idx)} className="flex items-center justify-center w-5 h-5 rounded-full" style={{ color: "rgba(13,27,42,0.3)" }}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {/* Resumen sets */}
              {sets.some(s => s.s1 !== "" && s.s2 !== "") && (
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-xs font-black" style={{ color: NAVY }}>
                    {sets.filter(s => Number(s.s1) > Number(s.s2)).length} sets
                  </span>
                  <span className="text-[10px]" style={{ color: "rgba(13,27,42,0.3)" }}>sets ganados</span>
                  <span className="text-xs font-black" style={{ color: NAVY }}>
                    {sets.filter(s => Number(s.s2) > Number(s.s1)).length} sets
                  </span>
                </div>
              )}
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

      {tab === "stats" && (
        <StatsView
          participants={participants}
          matches={finishedMatches}
          participantType={tournament.participantType}
        />
      )}

      {tab === "ladder" && isLadder && (
        <LadderView
          businessId={businessId}
          tournamentId={tournamentId}
          participantType={tournament.participantType}
          tournamentStatus={tournament.status}
          categoryId={hasCategories ? activeCategoryId : null}
          endDate={tournament.endDate}
        />
      )}
    </div>
  )
}

// Drag-to-reorder wrapper for MatchRow
function SortableMatchRow({ match, canEdit, onEdit }: { match: Match; canEdit: boolean; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: match.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-stretch rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.15)" }}>
        <button {...attributes} {...listeners}
          className="px-2 flex items-center cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ background: "rgba(13,27,42,0.03)", borderRight: "1px solid rgba(13,27,42,0.06)", color: "rgba(13,27,42,0.25)", touchAction: "none" }}>
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1">
          <MatchRow match={match} canEdit={canEdit} onEdit={onEdit} />
        </div>
      </div>
    </div>
  )
}

// Calendar grid view — rows=times, cols=courts
function MatchCalendar({ matches, courtCount, canEdit, selectedId, onSelectMatch, onMoveMatch }: {
  matches: Match[]; courtCount: number; canEdit: boolean
  selectedId: string | null; onSelectMatch: (id: string | null) => void
  onMoveMatch: (matchId: string, isoTime: string, court: number) => void
}) {
  const courts = Array.from({ length: Math.max(courtCount, 1) }, (_, i) => i + 1)
  const scheduledMatches = matches.filter(m => m.scheduledTime)
  const unscheduledMatches = matches.filter(m => !m.scheduledTime)

  // Unique (date+time) sorted
  const times = [...new Set(scheduledMatches.map(m => new Date(m.scheduledTime!).toISOString()))].sort()

  const matchMap = new Map<string, Match>()
  scheduledMatches.forEach(m => {
    if (m.courtNumber) matchMap.set(`${new Date(m.scheduledTime!).toISOString()}|${m.courtNumber}`, m)
  })

  if (times.length === 0 && unscheduledMatches.length === 0) return null

  return (
    <div className="space-y-4">
      {times.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid rgba(201,168,76,0.2)" }}>
          <div className="overflow-x-auto">
            <div style={{ minWidth: courts.length * 130 + 72 }}>
              {/* Header */}
              <div className="grid" style={{ gridTemplateColumns: `72px repeat(${courts.length}, 1fr)`, borderBottom: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.05)" }}>
                <div className="py-2" />
                {courts.map(c => (
                  <div key={c} className="py-2 text-center text-[10px] font-black uppercase tracking-wide" style={{ color: GOLD }}>
                    Cancha {c}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {times.map((iso, rowIdx) => (
                <div key={iso} className="grid" style={{ gridTemplateColumns: `72px repeat(${courts.length}, 1fr)`, borderBottom: rowIdx < times.length - 1 ? "1px solid rgba(201,168,76,0.08)" : "none" }}>
                  <div className="flex flex-col items-end justify-center pr-2 py-2 flex-shrink-0">
                    <span className="text-[10px] font-black" style={{ color: NAVY }}>{format(new Date(iso), "HH:mm")}</span>
                    <span className="text-[9px]" style={{ color: "rgba(13,27,42,0.3)" }}>{format(new Date(iso), "dd/MM")}</span>
                  </div>
                  {courts.map(c => {
                    const m = matchMap.get(`${iso}|${c}`)
                    const isSelected = m?.id === selectedId
                    if (m) {
                      return (
                        <div key={c} className="p-1">
                          <button
                            onClick={() => canEdit ? onSelectMatch(isSelected ? null : m.id) : undefined}
                            className="w-full rounded-xl p-2 text-left transition-all"
                            style={{
                              background: isSelected ? "rgba(201,168,76,0.18)" : m.status === "FINISHED" ? "rgba(34,197,94,0.07)" : "rgba(13,27,42,0.04)",
                              border: isSelected ? `1.5px solid ${GOLD}` : m.status === "FINISHED" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(13,27,42,0.08)",
                              cursor: canEdit ? "pointer" : "default",
                            }}>
                            <p className="text-[9px] font-bold truncate" style={{ color: NAVY }}>{m.participant1?.name ?? "?"}</p>
                            <p className="text-[9px] text-center my-0.5" style={{ color: "rgba(13,27,42,0.3)" }}>vs</p>
                            <p className="text-[9px] font-bold truncate" style={{ color: NAVY }}>{m.participant2?.name ?? "?"}</p>
                            {m.status === "FINISHED" && <p className="text-[9px] text-center font-black mt-0.5" style={{ color: "#16a34a" }}>✓ Finalizado</p>}
                          </button>
                        </div>
                      )
                    }
                    return (
                      <div key={c} className="p-1">
                        {selectedId && canEdit ? (
                          <button onClick={() => onMoveMatch(selectedId, iso, c)}
                            className="w-full min-h-[64px] rounded-xl border-2 border-dashed flex items-center justify-center transition-all"
                            style={{ borderColor: "rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.04)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.1)" }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.04)" }}>
                            <span className="text-[9px] font-bold" style={{ color: "rgba(201,168,76,0.6)" }}>Mover aquí</span>
                          </button>
                        ) : (
                          <div className="w-full min-h-[64px] rounded-xl" style={{ background: "rgba(13,27,42,0.02)", border: "1px solid rgba(13,27,42,0.05)" }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {unscheduledMatches.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(13,27,42,0.4)" }}>Sin horario asignado</p>
          <div className="flex flex-wrap gap-2">
            {unscheduledMatches.map(m => {
              const isSelected = m.id === selectedId
              return (
                <button key={m.id}
                  onClick={() => canEdit ? onSelectMatch(isSelected ? null : m.id) : undefined}
                  className="rounded-xl px-3 py-2 text-[10px] font-bold transition-all"
                  style={{
                    background: isSelected ? "rgba(201,168,76,0.18)" : "rgba(13,27,42,0.05)",
                    border: isSelected ? `1.5px solid ${GOLD}` : "1px solid rgba(13,27,42,0.1)",
                    color: NAVY, cursor: canEdit ? "pointer" : "default",
                  }}>
                  {m.participant1?.name ?? "?"} vs {m.participant2?.name ?? "?"}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function MatchRow({ match: m, canEdit, onEdit }: { match: Match; canEdit: boolean; onEdit: () => void }) {
  const hasBye = !m.participant1 || !m.participant2
  const isFinished = m.status === "FINISHED"
  const timeLabel = m.scheduledTime ? format(new Date(m.scheduledTime), "HH:mm", {}) : null
  const courtLabel = m.courtNumber ? `C${m.courtNumber}` : null
  return (
    <div style={{ borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
      {/* Cancha y hora */}
      {(courtLabel || timeLabel) && (
        <div className="flex items-center gap-2 px-3 pt-1.5">
          {courtLabel && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(13,27,42,0.06)", color: "rgba(13,27,42,0.45)" }}>
              {courtLabel}
            </span>
          )}
          {timeLabel && (
            <span className="text-[9px] font-semibold" style={{ color: "rgba(13,27,42,0.35)" }}>{timeLabel}</span>
          )}
        </div>
      )}
      <div className="flex items-stretch">
        <div className="flex-1 flex items-center gap-2 px-3 py-2"
          style={{ background: m.winner?.id === m.participant1?.id ? "rgba(201,168,76,0.06)" : "transparent" }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
            style={{ background: m.participant1 ? "#0d1b2a" : "rgba(13,27,42,0.1)" }}>
            {m.participant1 ? m.participant1.name[0] : "?"}
          </div>
          <p className="text-xs font-bold truncate" style={{ color: m.participant1 ? "#0d1b2a" : "rgba(13,27,42,0.25)" }}>
            {m.participant1?.name ?? "Por definir"}
          </p>
          {m.winner?.id === m.participant1?.id && <Check className="w-3 h-3 flex-shrink-0" style={{ color: "#C9A84C" }} />}
        </div>
        <div className="flex flex-col items-center justify-center px-2 flex-shrink-0 min-w-[60px]"
          style={{ borderLeft: "1px solid rgba(13,27,42,0.07)", borderRight: "1px solid rgba(13,27,42,0.07)" }}>
          {isFinished && m.sets?.length ? (
            <>
              <div className="flex gap-1">
                {m.sets.map((s, i) => (
                  <span key={i} className="text-[10px] font-black" style={{ color: s.s1 > s.s2 ? NAVY : "rgba(13,27,42,0.3)" }}>{s.s1}</span>
                ))}
              </div>
              <div className="w-full" style={{ borderTop: "1px solid rgba(13,27,42,0.1)", margin: "2px 0" }} />
              <div className="flex gap-1">
                {m.sets.map((s, i) => (
                  <span key={i} className="text-[10px] font-black" style={{ color: s.s2 > s.s1 ? NAVY : "rgba(13,27,42,0.3)" }}>{s.s2}</span>
                ))}
              </div>
            </>
          ) : isFinished ? (
            <p className="text-xs font-black whitespace-nowrap" style={{ color: NAVY }}>{m.score1 ?? "–"} – {m.score2 ?? "–"}</p>
          ) : (
            <p className="text-[10px] font-semibold" style={{ color: "rgba(13,27,42,0.25)" }}>vs</p>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 justify-end"
          style={{ background: m.winner?.id === m.participant2?.id ? "rgba(201,168,76,0.06)" : "transparent" }}>
          {m.winner?.id === m.participant2?.id && <Check className="w-3 h-3 flex-shrink-0" style={{ color: "#C9A84C" }} />}
          <p className="text-xs font-bold truncate text-right" style={{ color: m.participant2 ? "#0d1b2a" : "rgba(13,27,42,0.25)" }}>
            {m.participant2?.name ?? (hasBye && m.participant1 ? "BYE" : "Por definir")}
          </p>
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
            style={{ background: m.participant2 ? "#0d1b2a" : "rgba(13,27,42,0.1)" }}>
            {m.participant2 ? m.participant2.name[0] : "?"}
          </div>
        </div>
        {!hasBye && canEdit && m.participant1 && m.participant2 && (
          <button onClick={onEdit} className="px-3 flex items-center justify-center flex-shrink-0 transition-all"
            style={{ borderLeft: "1px solid rgba(13,27,42,0.07)", color: "#C9A84C" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.06)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
