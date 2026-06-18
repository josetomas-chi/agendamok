"use client"

import { Phone, Mail, Clock, User, Pencil, Trash2, CheckCircle, DollarSign } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Appt = {
  id: string
  startTime: Date | string
  endTime: Date | string
  status: string
  service: { name: string; color: string; price: number | null }
  staff: { id: string; color: string; user: { name: string | null; image: string | null } }
  client: { name: string; email: string | null; phone: string | null }
  notes: string | null
  payment: { status: string; method: string; amount: number } | null
}

interface Props {
  appt: Appt | null
  cancelling: boolean
  onClose: () => void
  onEdit: (appt: Appt) => void
  onPay: (appt: Appt) => void
  onComplete: () => void
  onCancel: () => void
}

function fmt(dt: Date | string) {
  return new Date(dt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
}

export function ApptDetailDialog({ appt, cancelling, onClose, onEdit, onPay, onComplete, onCancel }: Props) {
  return (
    <Dialog open={!!appt} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        {appt && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: appt.service.color }} />
                {appt.service.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-white/40 flex-shrink-0" />
                <span className="text-white/70">{fmt(appt.startTime)} – {fmt(appt.endTime)}</span>
              </div>

              <div className="border-t border-white/5 pt-3 space-y-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <span className="text-white font-medium">{appt.client.name}</span>
                </div>
                {appt.client.phone && (
                  <a href={`tel:${appt.client.phone}`} className="flex items-center gap-3 text-sm group">
                    <Phone className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <span className="text-sky-400 group-hover:text-sky-300 transition-colors">{appt.client.phone}</span>
                  </a>
                )}
                {appt.client.email && (
                  <a href={`mailto:${appt.client.email}`} className="flex items-center gap-3 text-sm group">
                    <Mail className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <span className="text-sky-400 group-hover:text-sky-300 transition-colors">{appt.client.email}</span>
                  </a>
                )}
                {appt.notes && (
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-xs text-white/50">
                    {appt.notes}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-xs text-white/30">
                <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: appt.staff.color }} />
                {appt.staff.user.name}
              </div>

              {appt.payment?.status === "PAID" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-400 font-medium">
                    Pagado —{" "}
                    {appt.payment.method === "CASH" ? "Efectivo" : appt.payment.method === "CARD" ? "Tarjeta" : appt.payment.method === "TRANSFER" ? "Transferencia" : "Online"}
                    {appt.payment.amount ? ` · $${Number(appt.payment.amount).toLocaleString("es-CL")}` : ""}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-white/5 grid grid-cols-4 gap-2">
                <button onClick={() => onEdit(appt)} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 transition-colors">
                  <Pencil className="w-4 h-4 text-sky-400" />
                  <span className="text-[10px] text-sky-400 font-medium">Modificar</span>
                </button>

                {appt.payment?.status === "PAID" ? (
                  <div className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-400/10">
                    <DollarSign className="w-4 h-4 text-emerald-400/50" />
                    <span className="text-[10px] text-emerald-400/50 font-medium">Cobrado</span>
                  </div>
                ) : (
                  <button onClick={() => onPay(appt)} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-400/20 transition-colors">
                    <DollarSign className="w-4 h-4 text-violet-400" />
                    <span className="text-[10px] text-violet-400 font-medium">Cobrar</span>
                  </button>
                )}

                {appt.status !== "COMPLETED" ? (
                  <button onClick={onComplete} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/20 transition-colors">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-medium">Completar</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-400/10">
                    <CheckCircle className="w-4 h-4 text-emerald-400/50" />
                    <span className="text-[10px] text-emerald-400/50 font-medium">Completado</span>
                  </div>
                )}

                <button onClick={onCancel} disabled={cancelling || appt.status === "CANCELLED"} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 transition-colors disabled:opacity-40">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span className="text-[10px] text-red-400 font-medium">{cancelling ? "..." : "Cancelar"}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}


