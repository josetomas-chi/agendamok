"use client"

import { useState, useEffect, useCallback } from "react"
import { useBusiness } from "@/contexts/business-context"
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react"
import { toast } from "sonner"

type StaffSummary = {
  staffId: string; name: string | null; color: string
  total: number; paid: number; pending: number; count: number
}
type Record_ = {
  id: string; amount: number; isPaid: boolean; rate: number; type: string; createdAt: string
  staff: { user: { name: string | null } }
  appointment: { startTime: string; service: { name: string }; client: { name: string } }
}

export default function CommissionsPage() {
  const { businessId } = useBusiness()
  const [refDate, setRefDate] = useState(new Date())
  const [byStaff, setByStaff] = useState<StaffSummary[]>([])
  const [records, setRecords] = useState<Record_[]>([])
  const [totals, setTotals] = useState({ total: 0, paid: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)

  const from = startOfMonth(refDate).toISOString()
  const to = endOfMonth(refDate).toISOString()
  const isCurrentMonth = format(refDate, "yyyy-MM") === format(new Date(), "yyyy-MM")

  const load = useCallback(async (bid: string, f: string, t: string) => {
    setLoading(true)
    const r = await fetch(`/api/businesses/${bid}/commissions?from=${f}&to=${t}`)
    const d = await r.json()
    setByStaff(d.byStaff || [])
    setRecords(d.records || [])
    setTotals(d.totals || { total: 0, paid: 0, pending: 0 })
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!businessId) return
    load(businessId, from, to)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  useEffect(() => {
    if (businessId) load(businessId, from, to)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refDate, businessId])

  async function markPaid(staffId: string) {
    setPaying(staffId)
    const r = await fetch(`/api/businesses/${businessId}/commissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, from, to }),
    })
    if (r.ok) {
      toast.success("Comisiones marcadas como pagadas")
      load(businessId, from, to)
    } else toast.error("Error al actualizar")
    setPaying(null)
  }

  const filteredRecords = selectedStaff
    ? records.filter(r => r.staff.user.name === byStaff.find(s => s.staffId === selectedStaff)?.name)
    : records

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Comisiones</h1>
          <p className="page-subtitle">Liquidación por profesional</p>
        </div>
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => setRefDate(d => subMonths(d, 1))}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white capitalize min-w-32 text-center">
            {format(refDate, "MMMM yyyy", { locale: es })}
          </span>
          <button onClick={() => setRefDate(d => addMonths(d, 1))} disabled={isCurrentMonth}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, label: "Total del período", value: totals.total, color: "text-sky-400", bg: "bg-sky-500/20" },
          { icon: CheckCircle, label: "Pagado", value: totals.paid, color: "text-green-400", bg: "bg-green-500/20" },
          { icon: Clock, label: "Pendiente de pago", value: totals.pending, color: "text-orange-400", bg: "bg-orange-500/20" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-3xl font-bold tracking-tight leading-none ${color}`}>${Math.round(value).toLocaleString("es-CL")}</p>
              <p className="text-[11px] text-white/40 mt-1.5 uppercase tracking-widest font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By staff */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">Por profesional</h3>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : byStaff.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No hay comisiones este mes
            </div>
          ) : (
            <div className="space-y-3">
              {byStaff.map(s => (
                <div
                  key={s.staffId}
                  onClick={() => setSelectedStaff(selectedStaff === s.staffId ? null : s.staffId)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${selectedStaff === s.staffId ? "border-sky-400/50 bg-sky-500/10" : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm font-semibold text-white truncate flex-1">{s.name}</span>
                    <span className="text-xs text-white/40">{s.count} turnos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-white/5 rounded-lg p-2">
                      <p className="text-white/40 mb-0.5">Total</p>
                      <p className="font-bold text-white">${Math.round(s.total).toLocaleString("es-CL")}</p>
                    </div>
                    <div className="bg-orange-500/10 rounded-lg p-2">
                      <p className="text-white/40 mb-0.5">Pendiente</p>
                      <p className="font-bold text-orange-400">${Math.round(s.pending).toLocaleString("es-CL")}</p>
                    </div>
                  </div>
                  {s.pending > 0 && (
                    <button
                      onClick={e => { e.stopPropagation(); markPaid(s.staffId) }}
                      disabled={paying === s.staffId}
                      className="w-full py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {paying === s.staffId ? "Procesando..." : "Marcar como pagado"}
                    </button>
                  )}
                  {s.pending === 0 && s.total > 0 && (
                    <div className="flex items-center justify-center gap-1 py-1 text-xs text-green-400/70">
                      <CheckCircle className="w-3 h-3" /> Todo pagado
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4">
            Detalle de turnos
            {selectedStaff && (
              <button onClick={() => setSelectedStaff(null)} className="ml-2 text-xs text-sky-400 hover:underline">
                Ver todos
              </button>
            )}
          </h3>
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No hay registros{selectedStaff ? " para este profesional" : " este mes"}
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/8 text-xs font-medium text-white/40 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Turno</th>
                    <th className="text-left px-4 py-2.5">Profesional</th>
                    <th className="text-right px-4 py-2.5">Comisión</th>
                    <th className="text-center px-4 py-2.5">Estado</th>
                  </tr>
                </thead>
              </table>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-white/5">
                    {filteredRecords.map(r => (
                      <tr key={r.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{r.appointment.client.name}</p>
                          <p className="text-xs text-white/40">
                            {r.appointment.service.name} · {format(new Date(r.appointment.startTime), "d MMM", { locale: es })}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">{r.staff.user.name}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <p className="font-bold text-sky-400">${Math.round(Number(r.amount)).toLocaleString("es-CL")}</p>
                          <p className="text-[10px] text-white/30">{r.type === "PERCENTAGE" ? `${r.rate}%` : `$${r.rate} fijo`}</p>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${r.isPaid ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" : "bg-orange-500/25 text-orange-300 border-orange-400/50 shadow-[0_0_8px_rgba(249,115,22,0.2)]"}`}>
                            {r.isPaid ? "Pagado" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
