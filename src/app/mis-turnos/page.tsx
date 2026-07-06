"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Calendar, Clock, MapPin, User, Loader2, LogOut, RefreshCw, X, LayoutGrid, List, CheckCircle2 } from "lucide-react"
import { MokIcon } from "@/components/ui/mok-icon"
import { toast } from "sonner"
import { ClientCalendar } from "@/components/client/client-calendar"

type Appointment = {
  id: string
  status: string
  cancelToken: string | null
  date: string
  time: string
  isPast: boolean
  startTimeISO: string
  staffId: string | null
  businessId: string
  service: { name: string; duration: number; color: string }
  staff: string | null
  business: { name: string; slug: string; address: string | null; logo: string | null }
}

// ─── Login flow ───────────────────────────────────────────────────────────────

function LoginPanel({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  async function requestCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const r = await fetch("/api/client/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (r.ok) {
      setStep("code")
    } else {
      toast.error("No se pudo enviar el código. Intenta de nuevo.")
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const r = await fetch("/api/client/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    })
    setLoading(false)
    if (r.ok) {
      onSuccess()
    } else {
      toast.error("Código incorrecto o expirado")
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <div className="bg-[#28282c] rounded-2xl border border-white/8 p-8">
        {step === "email" ? (
          <>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-sky-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Mis turnos</h1>
              <p className="text-white/40 text-sm mt-1">Ingresa tu email para ver tus reservas</p>
            </div>
            <form onSubmit={requestCode} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 text-white placeholder:text-white/25"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar →"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <CheckCircle2 className="w-10 h-10 text-sky-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white">Revisa tu email</h1>
              <p className="text-white/40 text-sm mt-1">
                Enviamos un código de 6 dígitos a<br />
                <span className="text-sky-400">{email}</span>
              </p>
            </div>
            <form onSubmit={verifyCode} className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                maxLength={6}
                className="w-full h-14 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-2xl font-bold tracking-[0.3em] text-center focus:outline-none focus:ring-1 focus:ring-sky-400 text-white placeholder:text-white/20"
              />
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setCode("") }}
                className="w-full text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                ← Cambiar email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Portal ───────────────────────────────────────────────────────────────────

function ClientPortal({ name, email, appointments, onLogout }: {
  name: string | null
  email: string
  appointments: Appointment[]
  onLogout: () => void
}) {
  const [items, setItems] = useState(appointments)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [view, setView] = useState<"list" | "calendar">("list")

  async function cancel(appt: Appointment) {
    if (!appt.cancelToken) return
    setCancelling(appt.id)
    const r = await fetch(`/api/public/cancel?token=${appt.cancelToken}`)
    if (r.ok) {
      setItems(prev => prev.map(a => a.id === appt.id ? { ...a, status: "CANCELLED" } : a))
      toast.success("Turno cancelado")
    } else {
      const d = await r.json()
      toast.error(d.error || "No se pudo cancelar")
    }
    setCancelling(null)
  }

  function handleRescheduled(id: string, newStartISO: string) {
    setItems(prev => prev.map(a => {
      if (a.id !== id) return a
      const d = new Date(newStartISO)
      const date = d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      const time = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
      return { ...a, startTimeISO: newStartISO, date, time, isPast: d < new Date() }
    }))
  }

  const upcoming = items.filter(a => !a.isPast && a.status !== "CANCELLED")
  const past = items.filter(a => a.isPast || a.status === "CANCELLED")

  return (
    <div>
      {/* User bar */}
      <div className="flex items-center justify-between mb-6 bg-[#28282c] rounded-2xl px-5 py-4 border border-white/8">
        <div>
          <p className="font-semibold text-white text-sm">{name ? `Hola, ${name}` : "Mi cuenta"}</p>
          <p className="text-xs text-white/35">{email}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle — only on desktop */}
          <div className="hidden md:flex items-center gap-1 bg-white/[0.05] rounded-lg p-1">
            {([["list", List], ["calendar", LayoutGrid]] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`p-1.5 rounded-md transition-colors ${view === v ? "bg-sky-500/20 text-sky-400" : "text-white/30 hover:text-white/60"}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <div className="mb-8">
          <ClientCalendar
            appointments={items.filter(a => !a.isPast && a.status !== "CANCELLED")}
            onRescheduled={handleRescheduled}
          />
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <>
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-sky-400/70 mb-3">
              Próximos ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="text-center py-10 bg-[#28282c] rounded-2xl border border-white/8">
                <Calendar className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-white/30 text-sm">Sin turnos próximos</p>
                <Link href="/" className="inline-block mt-3 text-sm text-sky-400 hover:text-sky-300 transition-colors">
                  Buscar negocios →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(a => (
                  <AppointmentCard key={a.id} appointment={a} onCancel={() => cancel(a)} cancelling={cancelling === a.id} />
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-3">
                Historial ({past.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {past.map(a => (
                  <AppointmentCard key={a.id} appointment={a} showRebook />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function AppointmentCard({ appointment: a, onCancel, cancelling, showRebook }: {
  appointment: Appointment
  onCancel?: () => void
  cancelling?: boolean
  showRebook?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: a.service.color + "22", border: `1.5px solid ${a.service.color}44` }}
        >
          {a.business.logo
            ? <img src={a.business.logo} alt={a.business.name} className="w-full h-full object-cover" />
            : <span className="text-sm font-bold" style={{ color: a.service.color }}>{a.business.name[0]}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate">{a.business.name}</p>
          <p className="text-xs text-white/50 truncate">{a.service.name} · {a.service.duration} min</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <span className="flex items-center gap-1 text-[11px] text-white/35">
              <Calendar className="w-3 h-3" />{a.date}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-white/35">
              <Clock className="w-3 h-3" />{a.time}
            </span>
            {a.staff && (
              <span className="flex items-center gap-1 text-[11px] text-white/35">
                <User className="w-3 h-3" />{a.staff}
              </span>
            )}
            {a.business.address && (
              <span className="flex items-center gap-1 text-[11px] text-white/35 truncate">
                <MapPin className="w-3 h-3" />{a.business.address}
              </span>
            )}
          </div>
        </div>
        {a.status === "CANCELLED" && (
          <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full flex-shrink-0">Cancelado</span>
        )}
      </div>

      {(onCancel || showRebook) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
          {showRebook && a.status !== "CANCELLED" && (
            <Link
              href={`/book/${a.business.slug}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reservar de nuevo
            </Link>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MisTurnosPage() {
  const [state, setState] = useState<"loading" | "login" | "portal">("loading")
  const [clientData, setClientData] = useState<{
    email: string; name: string | null; appointments: Appointment[]
  } | null>(null)

  async function loadMe() {
    const r = await fetch("/api/client/me")
    if (r.ok) {
      const data = await r.json()
      setClientData(data)
      setState("portal")
    } else {
      setState("login")
    }
  }

  useEffect(() => { loadMe() }, [])

  async function handleLogout() {
    await fetch("/api/client/auth/logout", { method: "POST" })
    setClientData(null)
    setState("login")
  }

  return (
    <div className="min-h-screen bg-[#1a1a1e] text-white">
      {/* Header */}
      <div className="border-b border-white/8 bg-[#28282c]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ boxShadow: "0 0 12px rgba(56,189,248,0.4)" }}>
              <img src="/mok-icon.png" alt="AgendaMok" width={28} height={28} className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-[15px]">Agenda<span className="text-sky-400">Mok</span></span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {state === "loading" && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
        )}
        {state === "login" && (
          <LoginPanel onSuccess={loadMe} />
        )}
        {state === "portal" && clientData && (
          <ClientPortal
            name={clientData.name}
            email={clientData.email}
            appointments={clientData.appointments}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  )
}
