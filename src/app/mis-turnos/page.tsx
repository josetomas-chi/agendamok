"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, Clock, MapPin, User, Loader2, Search, ChevronRight } from "lucide-react"

type Appointment = {
  id: string
  status: string
  date: string
  time: string
  isPast: boolean
  service: { name: string; duration: number; color: string }
  staff: string | null
  business: { name: string; slug: string; address: string | null; logo: string | null }
}

function MisTurnosContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [loading, setLoading] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [searched, setSearched] = useState(!!params.get("email"))

  async function search(e?: React.FormEvent) {
    e?.preventDefault()
    if (!email.includes("@")) return
    setLoading(true)
    setSearched(true)
    router.replace(`/mis-turnos?email=${encodeURIComponent(email)}`, { scroll: false })
    const r = await fetch(`/api/public/mis-turnos?email=${encodeURIComponent(email)}`)
    const data = await r.json()
    setAppointments(data.appointments ?? [])
    setLoading(false)
  }

  // Auto-search if email in URL
  if (params.get("email") && appointments === null && !loading && !searched) {
    search()
  }

  const upcoming = appointments?.filter(a => !a.isPast) ?? []
  const past = appointments?.filter(a => a.isPast) ?? []

  return (
    <div className="min-h-screen bg-[#28282c] text-white">
      {/* Header */}
      <div className="border-b border-white/8" style={{ background: "#232326" }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center" style={{ boxShadow: "0 0 12px rgba(14,165,233,0.4)" }}>
              <Calendar className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[15px]">Agenda<span className="text-sky-400">Mok</span></span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Mis turnos</h1>
          <p className="text-white/40 text-sm">Ingresa tu email para ver todos tus turnos reservados.</p>
        </div>

        {/* Search */}
        <form onSubmit={search} className="flex gap-2 mb-8">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="flex-1 h-11 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 text-white placeholder:text-white/25"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-11 px-5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </form>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
          </div>
        )}

        {!loading && appointments !== null && appointments.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/40">No encontramos turnos para este email.</p>
          </div>
        )}

        {!loading && appointments !== null && appointments.length > 0 && (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-sky-400/70 mb-3">Próximos</h2>
                <div className="space-y-3">
                  {upcoming.map(a => <AppointmentCard key={a.id} appointment={a} />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-3">Historial</h2>
                <div className="space-y-3 opacity-60">
                  {past.map(a => <AppointmentCard key={a.id} appointment={a} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  return (
    <Link
      href={`/book/${a.business.slug}`}
      className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] transition-all group"
    >
      {/* Business logo */}
      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{ background: a.service.color + "22", border: `1.5px solid ${a.service.color}44` }}>
        {a.business.logo
          ? <img src={a.business.logo} alt={a.business.name} className="w-full h-full object-cover" />
          : <span className="text-sm font-bold" style={{ color: a.service.color }}>{a.business.name[0]}</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{a.business.name}</p>
        <p className="text-xs text-white/50 truncate">{a.service.name}</p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-white/35">
            <Calendar className="w-3 h-3" />{a.date}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-white/35">
            <Clock className="w-3 h-3" />{a.time} hrs
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

      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 flex-shrink-0 transition-colors" />
    </Link>
  )
}

export default function MisTurnosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#28282c]">
        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
      </div>
    }>
      <MisTurnosContent />
    </Suspense>
  )
}
