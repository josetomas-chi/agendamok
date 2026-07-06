"use client"
import React, { useState, useEffect, useCallback } from "react"
import { Trophy, Plus, Calendar, Users, MapPin, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import NewBookingModal from "./_components/new-booking-modal"

// Types
type Court = { id: string; name: string; sport: string | null; color: string; isActive: boolean }
type Client = { id: string; name: string; email: string | null; phone: string | null }
type Booking = {
  id: string; courtId: string; clientId: string | null
  startTime: string; endTime: string; price: number; status: string; notes: string | null
  court: Court; client: Client | null
}

export default function ClubPage() {
  const [businessId, setBusinessId] = useState("")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [membersCount, setMembersCount] = useState(0)
  const [newBookingOpen, setNewBookingOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (bid: string) => {
    const today = new Date()
    const from = startOfWeek(today, { weekStartsOn: 1 }).toISOString()
    const to = endOfWeek(today, { weekStartsOn: 1 }).toISOString()
    const [bRes, cRes, clRes, mRes] = await Promise.all([
      fetch(`/api/businesses/${bid}/court-bookings?from=${from}&to=${to}`),
      fetch(`/api/businesses/${bid}/courts`),
      fetch(`/api/businesses/${bid}/clients`),
      fetch(`/api/businesses/${bid}/client-memberships`),
    ])
    const [bData, cData, clData, mData] = await Promise.all([bRes.json(), cRes.json(), clRes.json(), mRes.json()])
    setBookings(bData.bookings || [])
    setCourts((cData.courts || []).filter((c: Court) => c.isActive))
    setClients(clData.clients || [])
    setMembersCount((mData.memberships || []).filter((m: { status: string }) => m.status === "ACTIVE").length)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(s => {
      const bid = s?.user?.businessId
      if (bid) { setBusinessId(bid); load(bid) }
    })
  }, [load])

  const todayBookings = bookings.filter(b => {
    const d = new Date(b.startTime)
    return d >= startOfDay(new Date()) && d <= endOfDay(new Date())
  })
  const weekBookings = bookings.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="page-title">Club Deportivo</h1>
            <p className="page-subtitle">Canchas, reservas y membresías</p>
          </div>
        </div>
        <Button onClick={() => setNewBookingOpen(true)} className="bg-sky-500 hover:bg-sky-400 gap-2">
          <Plus className="w-4 h-4" /> Nueva reserva
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Canchas activas", value: courts.length, icon: MapPin, color: "text-sky-400", bg: "bg-sky-500/10" },
          { label: "Reservas hoy", value: todayBookings.length, icon: Calendar, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Reservas esta semana", value: weekBookings, icon: Clock, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Socios activos", value: membersCount, icon: Users, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{loading ? "–" : s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Today's bookings */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Reservas de hoy</p>
          <p className="text-xs text-white/40">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-white/30 text-sm">Cargando…</div>
        ) : todayBookings.length === 0 ? (
          <div className="p-8 text-center text-white/30 text-sm">Sin reservas para hoy</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {todayBookings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(b => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors">
                <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: b.court.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{b.court.name}{b.court.sport ? ` · ${b.court.sport}` : ""}</p>
                  <p className="text-xs text-white/40 mt-0.5">{b.client?.name || "Sin cliente"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{format(new Date(b.startTime), "HH:mm")} – {format(new Date(b.endTime), "HH:mm")}</p>
                  <p className="text-xs text-sky-400">${Number(b.price).toLocaleString("es-CL")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {newBookingOpen && (
        <NewBookingModal
          businessId={businessId}
          courts={courts}
          clients={clients}
          onClose={() => setNewBookingOpen(false)}
          onSaved={() => { setNewBookingOpen(false); load(businessId) }}
        />
      )}
    </div>
  )
}
