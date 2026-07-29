"use client"
import React, { useState } from "react"
import { X, Send, Bell, CheckCircle } from "lucide-react"
import { toast } from "sonner"

type Recipient = { name: string; email: string }

interface NotifyModalProps {
  businessId: string
  recipients: Recipient[]
  contextLabel: string  // e.g. "8 inscritos", "5 socios activos"
  onClose: () => void
}

export function NotifyModal({ businessId, recipients, contextLabel, onClose }: NotifyModalProps) {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<{ sent: number; failed: number } | null>(null)

  const valid = recipients.filter(r => r.email?.includes("@"))

  async function handleSend() {
    if (!subject.trim()) { toast.error("Escribe un asunto"); return }
    if (!message.trim()) { toast.error("Escribe un mensaje"); return }
    setSending(true)
    try {
      const r = await fetch(`/api/businesses/${businessId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), recipients: valid }),
      })
      const data = await r.json()
      if (!r.ok) { toast.error(data.error ?? "Error al enviar"); return }
      setDone(data)
    } catch {
      toast.error("Error al enviar")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "#1c1c20", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(56,189,248,0.12)" }}>
              <Bell className="w-4 h-4" style={{ color: "#38bdf8" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Notificar participantes</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{contextLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            /* Success state */
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(34,197,94,0.12)" }}>
                <CheckCircle className="w-6 h-6" style={{ color: "#22c55e" }} />
              </div>
              <p className="font-bold text-white">Notificaciones enviadas</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                {done.sent} enviado{done.sent !== 1 ? "s" : ""}
                {done.failed > 0 && ` · ${done.failed} fallido${done.failed !== 1 ? "s" : ""}`}
              </p>
              <button onClick={onClose}
                className="mt-2 px-5 h-9 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
                style={{ background: "#38bdf8", color: "#0c1a2e" }}>
                Cerrar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recipient count */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.12)" }}>
                <Send className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#38bdf8" }} />
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Se enviará a{" "}
                  <strong style={{ color: "#38bdf8" }}>{valid.length} destinatario{valid.length !== 1 ? "s" : ""}</strong>
                  {valid.length < recipients.length && (
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>
                      {" "}({recipients.length - valid.length} sin email)
                    </span>
                  )}
                </p>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>ASUNTO</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ej: Cambio de horario este sábado"
                  className="w-full h-10 rounded-xl px-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(56,189,248,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                  maxLength={120}
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>MENSAJE</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Escribe aquí tu mensaje..."
                  rows={5}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none resize-none transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(56,189,248,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={onClose} disabled={sending}
                  className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                  Cancelar
                </button>
                <button onClick={handleSend} disabled={sending || valid.length === 0}
                  className="flex-1 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                  style={{ background: "#38bdf8", color: "#0c1a2e" }}>
                  {sending ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {sending ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
