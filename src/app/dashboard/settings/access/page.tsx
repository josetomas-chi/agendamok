"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { useBusiness } from "@/contexts/business-context"
import { toast } from "sonner"
import { Lock, LockOpen, Plus, Trash2, Check, X, Upload, Download, Search, ChevronDown } from "lucide-react"

const NAVY = "#0d1b2a"
const BORDER = "1px solid rgba(13,27,42,0.1)"

const ROLES = [
  { value: "APODERADO", label: "Apoderado" },
  { value: "ALUMNO", label: "Alumno" },
  { value: "PROFESOR", label: "Profesor" },
  { value: "EXALUMNO", label: "Exalumno" },
  { value: "OTRO", label: "Otro" },
]
const ROLE_LABELS: Record<string, string> = { APODERADO: "Apoderado", ALUMNO: "Alumno", PROFESOR: "Profesor", EXALUMNO: "Exalumno", OTRO: "Otro" }
const STATUS_STYLE: Record<string, { bg: string; border: string; color: string; label: string }> = {
  APPROVED: { bg: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#15803d", label: "Aprobado" },
  PENDING:  { bg: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", color: "#92400e", label: "Pendiente" },
  REJECTED: { bg: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#dc2626", label: "Rechazado" },
}

type Entry = { id: string; rut: string; name: string; email: string | null; phone: string | null; role: string; status: string; createdAt: string }

function fmt(s: string) {
  const d = new Date(s)
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })
}

export default function AccessPage() {
  const { businessId } = useBusiness()
  const [accessMode, setAccessMode] = useState<"OPEN" | "CLOSED">("OPEN")
  const [savingMode, setSavingMode] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "APPROVED" | "PENDING" | "REJECTED">("ALL")

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [addRut, setAddRut] = useState("")
  const [addName, setAddName] = useState("")
  const [addEmail, setAddEmail] = useState("")
  const [addPhone, setAddPhone] = useState("")
  const [addRole, setAddRole] = useState("OTRO")
  const [adding, setAdding] = useState(false)

  // Client search suggestions
  const [clientSuggestions, setClientSuggestions] = useState<{ id: string; name: string; rut: string | null; email: string | null; phone: string | null }[]>([])
  const [pendingRut, setPendingRut] = useState<{ clientId: string; rut: string } | null>(null)

  // CSV import
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const loadAll = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    const [bizRes, listRes] = await Promise.all([
      fetch(`/api/businesses/${businessId}`),
      fetch(`/api/businesses/${businessId}/access-list`),
    ])
    const bizData = await bizRes.json()
    const listData = await listRes.json()
    setAccessMode(bizData.business?.accessMode ?? "OPEN")
    setEntries(listData.requests ?? [])
    setLoading(false)
  }, [businessId])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (!businessId || !search.trim()) { setClientSuggestions([]); return }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/businesses/${businessId}/clients?search=${encodeURIComponent(search)}`)
      const d = await r.json()
      const existingRuts = new Set(entries.map(e => e.rut))
      const suggestions = (d.clients ?? []).filter((c: { rut: string | null }) => !c.rut || !existingRuts.has(c.rut))
      setClientSuggestions(suggestions.slice(0, 5))
    }, 300)
    return () => clearTimeout(t)
  }, [search, businessId, entries])

  async function addClientToList(client: { id: string; name: string; rut: string | null; email: string | null; phone: string | null }, rutOverride?: string) {
    const rut = rutOverride ?? client.rut
    if (!rut) return
    // Save RUT to client record if it didn't have one
    if (!client.rut && rutOverride) {
      await fetch(`/api/businesses/${businessId}/clients/${client.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rut: rutOverride }),
      })
    }
    const r = await fetch(`/api/businesses/${businessId}/access-list`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rut, name: client.name, email: client.email, phone: client.phone, status: "APPROVED" }),
    })
    if (r.ok) { loadAll(); setSearch(""); setClientSuggestions([]); setPendingRut(null) }
  }

  async function toggleMode() {
    const next = accessMode === "OPEN" ? "CLOSED" : "OPEN"
    setSavingMode(true)
    const r = await fetch(`/api/businesses/${businessId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessMode: next }),
    })
    if (r.ok) { setAccessMode(next); toast.success(next === "CLOSED" ? "Acceso cerrado activado" : "Acceso abierto") }
    else toast.error("Error al cambiar modo")
    setSavingMode(false)
  }

  async function handleAdd() {
    if (!addRut.trim() || !addName.trim()) return toast.error("RUT y nombre son obligatorios")
    setAdding(true)
    const r = await fetch(`/api/businesses/${businessId}/access-list`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rut: addRut.trim(), name: addName.trim(), email: addEmail || null, phone: addPhone || null, role: addRole }),
    })
    if (r.ok) {
      toast.success("RUT agregado")
      setAddRut(""); setAddName(""); setAddEmail(""); setAddPhone(""); setAddRole("OTRO"); setShowAdd(false)
      loadAll()
    } else {
      const d = await r.json()
      toast.error(d.error ?? "Error")
    }
    setAdding(false)
  }

  async function handleStatus(entry: Entry, status: string) {
    const r = await fetch(`/api/businesses/${businessId}/access-list/${entry.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (r.ok) { toast.success(status === "APPROVED" ? "Aprobado" : "Rechazado"); loadAll() }
    else toast.error("Error")
  }

  async function handleDelete(entry: Entry) {
    if (!confirm(`¿Eliminar a ${entry.name} de la lista?`)) return
    const r = await fetch(`/api/businesses/${businessId}/access-list/${entry.id}`, { method: "DELETE" })
    if (r.ok) { toast.success("Eliminado"); loadAll() }
    else toast.error("Error")
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const text = await file.text()
    const lines = text.split("\n").filter(l => l.trim())
    // Expected columns: rut, name, role (optional), email (optional), phone (optional)
    const entries = lines.slice(1).map(line => {
      const [rut, name, role, email, phone] = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
      return { rut, name: name || rut, role: role || "OTRO", email: email || null, phone: phone || null }
    }).filter(e => e.rut)

    const r = await fetch(`/api/businesses/${businessId}/access-list`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    })
    const d = await r.json()
    toast.success(`${d.ok} de ${d.total} RUTs importados`)
    loadAll()
    setImporting(false)
    e.target.value = ""
  }

  function downloadTemplate() {
    const csv = "rut,nombre,rol,email,telefono\n12345678-9,Juan Pérez,APODERADO,juan@email.com,+56912345678\n"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "plantilla_acceso.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.rut.includes(search)
    const matchStatus = filterStatus === "ALL" || e.status === filterStatus
    return matchSearch && matchStatus
  })

  const pending = entries.filter(e => e.status === "PENDING")
  const approved = entries.filter(e => e.status === "APPROVED")

  const inputStyle = { background: "#f5f4f0", border: BORDER, color: NAVY }
  const inputClass = "w-full h-9 rounded-lg px-3 text-sm outline-none"
  const labelStyle = { color: "rgba(13,27,42,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black" style={{ color: NAVY }}>Control de acceso</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>
          Gestiona quién puede reservar en este negocio
        </p>
      </div>

      {/* Mode toggle */}
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: accessMode === "CLOSED" ? "2px solid #0d1b2a" : BORDER, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accessMode === "CLOSED" ? "#0d1b2a" : "rgba(13,27,42,0.06)" }}>
              {accessMode === "CLOSED"
                ? <Lock className="w-5 h-5 text-white" />
                : <LockOpen className="w-5 h-5" style={{ color: "rgba(13,27,42,0.4)" }} />}
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: NAVY }}>
                {accessMode === "CLOSED" ? "Acceso cerrado" : "Acceso abierto"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(13,27,42,0.45)" }}>
                {accessMode === "CLOSED"
                  ? "Solo RUTs aprobados pueden reservar"
                  : "Cualquier persona puede reservar online"}
              </p>
            </div>
          </div>
          <button onClick={toggleMode} disabled={savingMode}
            className="px-4 h-9 rounded-xl text-sm font-bold disabled:opacity-50 flex-shrink-0"
            style={accessMode === "CLOSED"
              ? { background: "rgba(13,27,42,0.06)", color: "rgba(13,27,42,0.6)", border: BORDER }
              : { background: NAVY, color: "#fff" }}>
            {savingMode ? "..." : accessMode === "CLOSED" ? "Abrir acceso" : "Cerrar acceso"}
          </button>
        </div>

        {accessMode === "CLOSED" && (
          <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: BORDER }}>
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-2xl font-black" style={{ color: "#15803d" }}>{approved.length}</p>
              <p className="text-xs font-bold" style={{ color: "rgba(13,27,42,0.5)" }}>Aprobados</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
              <p className="text-2xl font-black" style={{ color: "#92400e" }}>{pending.length}</p>
              <p className="text-xs font-bold" style={{ color: "rgba(13,27,42,0.5)" }}>Pendientes</p>
            </div>
          </div>
        )}
      </div>

      {/* Pending requests — siempre visible si hay */}
      {pending.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(251,191,36,0.4)", background: "#fff" }}>
          <div className="px-4 py-3" style={{ background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.2)" }}>
            <p className="text-xs font-black uppercase tracking-wide" style={{ color: "#92400e" }}>
              {pending.length} solicitud{pending.length !== 1 ? "es" : ""} pendiente{pending.length !== 1 ? "s" : ""}
            </p>
          </div>
          {pending.map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i > 0 ? BORDER : undefined }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{e.name}</p>
                <p className="text-xs" style={{ color: "rgba(13,27,42,0.45)" }}>
                  {e.rut} · {ROLE_LABELS[e.role] ?? e.role} · {fmt(e.createdAt)}
                </p>
                {(e.email || e.phone) && (
                  <p className="text-xs" style={{ color: "rgba(13,27,42,0.35)" }}>{[e.email, e.phone].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => handleStatus(e, "APPROVED")}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", color: "#15803d" }}>
                  <Check className="w-3 h-3" /> Aprobar
                </button>
                <button onClick={() => handleStatus(e, "REJECTED")}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#dc2626" }}>
                  <X className="w-3 h-3" /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List management */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: BORDER, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        {/* Toolbar */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-2" style={{ borderBottom: BORDER }}>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(13,27,42,0.35)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o RUT…"
              className="w-full h-8 rounded-lg pl-8 pr-3 text-sm outline-none"
              style={{ background: "#f5f4f0", border: BORDER, color: NAVY }} />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            className="h-8 rounded-lg px-2 text-xs font-bold outline-none"
            style={{ background: "#f5f4f0", border: BORDER, color: NAVY }}>
            <option value="ALL">Todos</option>
            <option value="APPROVED">Aprobados</option>
            <option value="PENDING">Pendientes</option>
            <option value="REJECTED">Rechazados</option>
          </select>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <button onClick={downloadTemplate} className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-bold"
            style={{ background: "#f5f4f0", border: BORDER, color: "rgba(13,27,42,0.6)" }}>
            <Download className="w-3 h-3" /> Plantilla
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-bold disabled:opacity-50"
            style={{ background: "#f5f4f0", border: BORDER, color: "rgba(13,27,42,0.6)" }}>
            <Upload className="w-3 h-3" /> {importing ? "Importando…" : "Importar CSV"}
          </button>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-bold"
            style={{ background: NAVY, color: "#fff" }}>
            <Plus className="w-3 h-3" /> Agregar RUT
          </button>
        </div>

        {/* Client suggestions */}
        {clientSuggestions.length > 0 && (
          <div style={{ borderBottom: BORDER }}>
            <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(13,27,42,0.4)" }}>
              Clientes encontrados — click para agregar a la lista
            </p>
            {clientSuggestions.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-2"
                style={{ borderTop: i > 0 ? BORDER : undefined, background: "rgba(13,27,42,0.02)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{c.name}</p>
                  <p className="text-xs" style={{ color: "rgba(13,27,42,0.45)" }}>
                    {[c.rut, c.email, c.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {c.rut ? (
                  <button onClick={() => addClientToList(c)}
                    className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#15803d" }}>
                    <Check className="w-3 h-3" /> Agregar
                  </button>
                ) : pendingRut?.clientId === c.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={pendingRut.rut}
                      onChange={e => setPendingRut({ clientId: c.id, rut: e.target.value })}
                      placeholder="12.345.678-9"
                      className="h-7 w-32 rounded-lg px-2 text-xs outline-none"
                      style={{ background: "#f5f4f0", border: BORDER, color: NAVY }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && pendingRut.rut.trim()) addClientToList(c, pendingRut.rut.trim())
                        if (e.key === "Escape") setPendingRut(null)
                      }}
                    />
                    <button onClick={() => { if (pendingRut.rut.trim()) addClientToList(c, pendingRut.rut.trim()) }}
                      className="flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-bold"
                      style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", color: "#15803d" }}>
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setPendingRut({ clientId: c.id, rut: "" })}
                    className="text-[10px] px-2 py-1 rounded-lg font-bold"
                    style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#92400e" }}>
                    + Agregar RUT
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="px-4 py-4 grid grid-cols-2 gap-3" style={{ borderBottom: BORDER, background: "rgba(13,27,42,0.02)" }}>
            <div>
              <label style={labelStyle}>RUT *</label>
              <input className={inputClass} style={inputStyle} value={addRut} onChange={e => setAddRut(e.target.value)} placeholder="12345678-9" />
            </div>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input className={inputClass} style={inputStyle} value={addName} onChange={e => setAddName(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <label style={labelStyle}>Rol</label>
              <select className={inputClass} style={inputStyle} value={addRole} onChange={e => setAddRole(e.target.value)}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input className={inputClass} style={inputStyle} value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="opcional" type="email" />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input className={inputClass} style={inputStyle} value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="opcional" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleAdd} disabled={adding}
                className="flex-1 h-9 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: NAVY, color: "#fff" }}>
                {adding ? "Agregando…" : "Agregar"}
              </button>
              <button onClick={() => setShowAdd(false)} className="h-9 px-3 rounded-lg text-sm"
                style={{ background: "#f5f4f0", color: "rgba(13,27,42,0.5)" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading && <p className="p-8 text-sm text-center" style={{ color: "rgba(13,27,42,0.4)" }}>Cargando…</p>}
        {!loading && filtered.length === 0 && (
          <p className="p-8 text-sm text-center" style={{ color: "rgba(13,27,42,0.4)" }}>
            {entries.length === 0 ? "Sin RUTs en la lista. Agrega uno o importa un CSV." : "Sin resultados para la búsqueda."}
          </p>
        )}
        {filtered.map((e, i) => {
          const st = STATUS_STYLE[e.status] ?? STATUS_STYLE.PENDING
          return (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i > 0 ? BORDER : undefined, background: i % 2 === 0 ? "#fff" : "rgba(13,27,42,0.012)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold truncate" style={{ color: NAVY }}>{e.name}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: st.bg, border: st.border, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "rgba(13,27,42,0.45)" }}>
                  {e.rut} · {ROLE_LABELS[e.role] ?? e.role}
                  {e.email ? ` · ${e.email}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {e.status === "PENDING" && (
                  <>
                    <button onClick={() => handleStatus(e, "APPROVED")}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                      <Check className="w-3.5 h-3.5" style={{ color: "#15803d" }} />
                    </button>
                    <button onClick={() => handleStatus(e, "REJECTED")}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <X className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                    </button>
                  </>
                )}
                {e.status === "REJECTED" && (
                  <button onClick={() => handleStatus(e, "APPROVED")}
                    className="h-6 px-2 rounded-lg text-[10px] font-bold"
                    style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#15803d" }}>
                    Aprobar
                  </button>
                )}
                {e.status === "APPROVED" && (
                  <button onClick={() => handleStatus(e, "REJECTED")}
                    className="h-6 px-2 rounded-lg text-[10px] font-bold"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>
                    Revocar
                  </button>
                )}
                <button onClick={() => handleDelete(e)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ border: BORDER }}>
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "rgba(13,27,42,0.35)" }} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* CSV format hint */}
      <div className="rounded-xl px-4 py-3" style={{ background: "rgba(13,27,42,0.03)", border: BORDER }}>
        <p className="text-xs font-bold mb-1" style={{ color: "rgba(13,27,42,0.5)" }}>Formato CSV para importación masiva</p>
        <code className="text-xs" style={{ color: "rgba(13,27,42,0.6)" }}>rut, nombre, rol, email, teléfono</code>
        <p className="text-xs mt-1" style={{ color: "rgba(13,27,42,0.4)" }}>
          Roles: APODERADO · ALUMNO · PROFESOR · EXALUMNO · OTRO. Email y teléfono son opcionales.
        </p>
      </div>
    </div>
  )
}
