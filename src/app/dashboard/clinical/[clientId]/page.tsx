"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Plus, Save, Trash2, FileText, Stethoscope } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Entry = {
  id: string; notes: string; staffName: string | null
  customFields: Record<string, string> | null; createdAt: string
}
type Record_ = {
  id: string; bloodType: string | null; allergies: string | null
  conditions: string | null; medications: string | null
  background: string | null; notes: string | null
  customFields: Record<string, string> | null
  client: { name: string }
  entries: Entry[]
}

const BLOOD_TYPES = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"]

export default function ClinicalRecordPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const router = useRouter()
  const [businessId, setBusinessId] = useState("")
  const [record, setRecord] = useState<Record_ | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [entryOpen, setEntryOpen] = useState(false)
  const [entryNotes, setEntryNotes] = useState("")
  const [entryFields, setEntryFields] = useState<Record<string, string>>({})
  const [newFieldName, setNewFieldName] = useState("")
  const [savingEntry, setSavingEntry] = useState(false)

  // Editable base form
  const [form, setForm] = useState({
    bloodType: "", allergies: "", conditions: "",
    medications: "", background: "", notes: "", customFields: {} as Record<string, string>,
  })

  const load = useCallback(async (bid: string) => {
    const r = await fetch(`/api/businesses/${bid}/clinical/${clientId}`)
    const d = await r.json()
    setRecord(d.record)
    if (d.record) {
      setForm({
        bloodType: d.record.bloodType || "",
        allergies: d.record.allergies || "",
        conditions: d.record.conditions || "",
        medications: d.record.medications || "",
        background: d.record.background || "",
        notes: d.record.notes || "",
        customFields: d.record.customFields || {},
      })
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(d => {
      setBusinessId(d.businessId)
      load(d.businessId)
    })
  }, [load])

  async function handleSave() {
    setSaving(true)
    const r = await fetch(`/api/businesses/${businessId}/clinical/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (r.ok) {
      toast.success("Ficha guardada")
      load(businessId)
    } else toast.error("Error al guardar")
    setSaving(false)
  }

  async function handleAddEntry() {
    if (!entryNotes.trim()) return
    setSavingEntry(true)
    const r = await fetch(`/api/businesses/${businessId}/clinical/${clientId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: entryNotes, customFields: Object.keys(entryFields).length > 0 ? entryFields : null }),
    })
    if (r.ok) {
      toast.success("Nota de visita guardada")
      setEntryOpen(false)
      setEntryNotes("")
      setEntryFields({})
      load(businessId)
    } else toast.error("Error al guardar")
    setSavingEntry(false)
  }

  async function handleDeleteEntry(entryId: string) {
    const r = await fetch(`/api/businesses/${businessId}/clinical/${clientId}/entries`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    })
    if (r.ok) { toast.success("Nota eliminada"); load(businessId) }
    else toast.error("Error al eliminar")
  }

  const clientName = record?.client.name || "Cliente"

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
      <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="page-title">Ficha clínica</h1>
            <p className="page-subtitle">{clientName}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Base record */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70">Datos del paciente</h3>

          <div className="space-y-1.5">
            <Label className="text-xs">Grupo sanguíneo</Label>
            <select value={form.bloodType} onChange={e => setForm(f => ({ ...f, bloodType: e.target.value }))}
              className="w-full h-8 text-sm rounded-lg border border-white/10 px-3 focus:outline-none focus:ring-1 focus:ring-sky-400"
              style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}>
              <option value="">No especificado</option>
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {[
            { key: "allergies", label: "Alergias" },
            { key: "conditions", label: "Condiciones crónicas" },
            { key: "medications", label: "Medicamentos actuales" },
            { key: "background", label: "Antecedentes familiares" },
            { key: "notes", label: "Notas generales" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <textarea
                value={(form as unknown as Record<string, string>)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-sky-400"
                style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}
                placeholder={`${label}...`}
              />
            </div>
          ))}

          {/* Custom fields */}
          {Object.entries(form.customFields).map(([k, v]) => (
            <div key={k} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{k}</Label>
                <button onClick={() => setForm(f => {
                  const cf = { ...f.customFields }; delete cf[k]; return { ...f, customFields: cf }
                })} className="text-red-400/50 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <input value={v} onChange={e => setForm(f => ({ ...f, customFields: { ...f.customFields, [k]: e.target.value } }))}
                className="w-full h-8 rounded-lg border border-white/10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }} />
            </div>
          ))}

          {/* Add custom field */}
          <div className="flex gap-2">
            <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)}
              placeholder="Nuevo campo..."
              className="flex-1 h-8 rounded-lg border border-white/10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
              style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}
              onKeyDown={e => {
                if (e.key === "Enter" && newFieldName.trim()) {
                  setForm(f => ({ ...f, customFields: { ...f.customFields, [newFieldName.trim()]: "" } }))
                  setNewFieldName("")
                }
              }}
            />
            <button onClick={() => {
              if (newFieldName.trim()) {
                setForm(f => ({ ...f, customFields: { ...f.customFields, [newFieldName.trim()]: "" } }))
                setNewFieldName("")
              }
            }} className="px-3 h-8 rounded-lg bg-white/10 hover:bg-white/15 text-white/60 text-xs transition-colors">
              + Agregar
            </button>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar ficha"}
          </Button>
        </div>

        {/* Visit entries */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/70">Notas de visita</h3>
            <button onClick={() => setEntryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nueva nota
            </button>
          </div>

          {(!record || record.entries.length === 0) ? (
            <div className="text-center py-12 text-white/25">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin notas de visita</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {record.entries.map(e => (
                <div key={e.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-xs text-white/40">
                        {format(new Date(e.createdAt), "d MMM yyyy HH:mm", { locale: es })}
                        {e.staffName && <span> · {e.staffName}</span>}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteEntry(e.id)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{e.notes}</p>
                  {e.customFields && Object.keys(e.customFields).length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      {Object.entries(e.customFields).map(([k, v]) => (
                        <div key={k} className="bg-white/5 rounded-lg px-2.5 py-1.5">
                          <p className="text-[10px] text-white/30 uppercase tracking-wide">{k}</p>
                          <p className="text-xs text-white/70 font-medium">{v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New entry dialog */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva nota de visita</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Notas de la visita *</Label>
              <textarea value={entryNotes} onChange={e => setEntryNotes(e.target.value)} rows={5}
                placeholder="Observaciones, diagnóstico, evolución..."
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-sky-400"
                style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }} />
            </div>

            {/* Custom fields for entry */}
            {Object.entries(entryFields).map(([k, v]) => (
              <div key={k} className="flex gap-2 items-center">
                <span className="text-xs text-white/50 w-24 flex-shrink-0">{k}</span>
                <input value={v} onChange={e => setEntryFields(f => ({ ...f, [k]: e.target.value }))}
                  className="flex-1 h-8 rounded-lg border border-white/10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                  style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }} />
                <button onClick={() => setEntryFields(f => { const n = { ...f }; delete n[k]; return n })} className="text-white/20 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              {["Peso", "Presión", "Temperatura", "FC"].map(field => (
                <button key={field} onClick={() => setEntryFields(f => ({ ...f, [field]: "" }))}
                  disabled={field in entryFields}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/50 text-xs transition-colors disabled:opacity-30">
                  + {field}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleAddEntry} disabled={savingEntry || !entryNotes.trim()}>
                {savingEntry ? "Guardando..." : "Guardar nota"}
              </Button>
              <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
