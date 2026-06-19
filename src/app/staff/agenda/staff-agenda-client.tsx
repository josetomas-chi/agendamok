"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Phone, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Appt = {
  id: string
  status: string
  time: string
  endTime: string
  client: { name: string; phone: string | null; email: string | null }
  service: { name: string; duration: number; color: string }
}

interface Props {
  appointments: Appt[]
  today: string
  staffName: string
  businessName: string
  businessLogo: string | null
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Completado",
  NO_SHOW: "No asistió",
  CANCELLED: "Cancelado",
}

export function StaffAgendaClient({ appointments, today, staffName, businessName }: Props) {
  const [items, setItems] = useState(appointments)
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(id: string, status: "COMPLETED" | "NO_SHOW") {
    setLoading(id)
    try {
      const appt = items.find(a => a.id === id)
      if (!appt) return

      // Find businessId via appointment — handled server-side
      const res = await fetch(`/api/staff/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      setItems(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      toast.success(status === "COMPLETED" ? "Turno completado" : "Marcado como no asistió")
    } catch {
      toast.error("No se pudo actualizar")
    } finally {
      setLoading(null)
    }
  }

  const pending = items.filter(a => ["PENDING", "CONFIRMED"].includes(a.status))
  const done = items.filter(a => ["COMPLETED", "NO_SHOW", "CANCELLED"].includes(a.status))

  return (
    <div className="min-h-screen bg-[#1a1a1e] text-white">
      {/* Header */}
      <div className="bg-[#28282c] border-b border-white/5 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <p className="text-xs text-slate-500 capitalize">{today}</p>
          <h1 className="text-lg font-bold text-white mt-0.5">{businessName}</h1>
          <p className="text-sm text-slate-400">Hola, {staffName}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Pending */}
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Pendientes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="text-center py-10 text-slate-600 text-sm">Sin turnos pendientes para hoy</div>
          ) : (
            <div className="space-y-3">
              {pending.map(appt => (
                <div key={appt.id} className="bg-[#28282c] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: appt.service.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white truncate">{appt.client.name}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{appt.time} – {appt.endTime}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{appt.service.name} · {appt.service.duration} min</p>
                      {appt.client.phone && (
                        <a
                          href={`tel:${appt.client.phone}`}
                          className="inline-flex items-center gap-1 text-xs text-sky-400 mt-2"
                        >
                          <Phone className="w-3 h-3" />{appt.client.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => updateStatus(appt.id, "COMPLETED")}
                      disabled={!!loading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {loading === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Completado
                    </button>
                    <button
                      onClick={() => updateStatus(appt.id, "NO_SHOW")}
                      disabled={!!loading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      No asistió
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Done */}
        {done.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Finalizados ({done.length})
            </h2>
            <div className="space-y-2">
              {done.map(appt => (
                <div key={appt.id} className="bg-[#28282c]/50 rounded-xl px-4 py-3 border border-white/5 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-300">{appt.client.name}</span>
                      <span className="text-slate-600 mx-2">·</span>
                      <span className="text-sm text-slate-500">{appt.service.name}</span>
                    </div>
                    <span className="text-xs text-slate-600">{STATUS_LABELS[appt.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
