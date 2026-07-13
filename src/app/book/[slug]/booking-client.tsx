"use client"

import React, { useState, useEffect, useRef } from "react"
import { format, addDays, startOfToday, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  Check, ChevronLeft, ChevronRight, Clock, MapPin, Calendar, User,
  Loader2, Download, Share2, Search, Phone, Star, ChevronDown, X
} from "lucide-react"
import { ChatWidget } from "@/components/booking/chat-widget"

type Category = { id: string; name: string; order: number }
type Service = {
  id: string; name: string; description: string | null; duration: number
  price: number; color: string; categoryId: string | null; category: Category | null
}
type Staff = {
  id: string; color: string; specialty: string | null; bio: string | null
  user: { name: string | null; image: string | null }
}
type PricingRule = { days: number[]; startTime: string; endTime: string; price: number }
type Court = { id: string; name: string; sport: string | null; color: string; description: string | null; sponsorName: string | null; sponsorLogo: string | null; sponsorUrl: string | null; pricingRules: PricingRule[] }
type Business = {
  id: string; name: string; category: string; description: string | null
  logo: string | null; coverImage: string | null; phone: string | null
  address: string | null; city: string | null
  onlinePaymentsEnabled: boolean; primaryColor: string | null
  businessType: string
  courts: Court[]
  services: Service[]; staff: Staff[]
}

type Step = "home" | "staff" | "datetime" | "form" | "confirmed"
type CourtStep = "home" | "court" | "datetime" | "form" | "confirmed"
type PayMethod = "online" | "local"

export default function BookingClient({ slug }: { slug: string }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/book/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setBusiness(d.business))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0f11" }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#38bdf8" }} />
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Cargando...</p>
      </div>
    </div>
  )

  if (notFound || !business) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0f11" }}>
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Negocio no encontrado</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>El link que seguiste no existe o está inactivo.</p>
      </div>
    </div>
  )

  if (business.businessType === "SPORTS_CLUB") {
    return <CourtBookingFlow business={business} slug={slug} />
  }
  return <ServiceBookingFlow business={business} slug={slug} />
}

// ─────────────────────────────────────────────────────────────────
// COURT BOOKING FLOW (Sports Club)
// ─────────────────────────────────────────────────────────────────

const SPORTS_BG = "#0d1b2a"
const SPORTS_CARD = "#0f2a3f"
const SPORTS_ACCENT = "#38bdf8"
const SPORTS_BORDER = "rgba(56,189,248,0.18)"

type CourtResult = Court & { slots: { time: string; price: number }[] }

function CourtBookingFlow({ business, slug }: { business: Business; slug: string }) {
  const today = startOfToday()

  // Search state
  const sports = [...new Set(business.courts.map(c => c.sport).filter(Boolean))] as string[]
  const [selectedSport, setSelectedSport] = useState(sports[0] || "")
  const [selectedDate, setSelectedDate] = useState(format(today, "yyyy-MM-dd"))
  const [duration, setDuration] = useState(60)
  const [weekOffset, setWeekOffset] = useState(0)

  // Results state
  const [results, setResults] = useState<CourtResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Booking state
  const [selectedCourt, setSelectedCourt] = useState<CourtResult | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; price: number } | null>(null)
  const [step, setStep] = useState<CourtStep>("home")
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [createAccount, setCreateAccount] = useState(false)
  const [password, setPassword] = useState("")
  const [emailExists, setEmailExists] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i))

  async function search() {
    setSearching(true)
    setHasSearched(true)
    const params = new URLSearchParams({ date: selectedDate, duration: String(duration) })
    if (selectedSport) params.set("sport", selectedSport)
    const r = await fetch(`/api/book/${slug}/courts/availability?${params}`)
    const d = await r.json()
    setResults(d.courts || [])
    setSearching(false)
  }

  // Auto-search when date/sport/duration changes after first search
  useEffect(() => {
    if (hasSearched) search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedSport, duration])

  async function handleConfirm() {
    if (!selectedCourt || !selectedSlot || !form.name || !form.email) return
    setSubmitting(true)
    const r = await fetch(`/api/book/${slug}/courts/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courtId: selectedCourt.id,
        date: selectedDate,
        time: selectedSlot.time,
        duration,
        clientName: form.name,
        clientEmail: form.email,
        clientPhone: form.phone || undefined,
        notes: form.notes || undefined,
        price: selectedSlot.price,
      }),
    })
    if (!r.ok) {
      const d = await r.json()
      alert(d.error || "Error al confirmar")
      setSubmitting(false)
      return
    }
    // Optional account creation
    if (createAccount && password.length >= 6) {
      await fetch(`/api/book/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password }),
      })
    }

    setStep("confirmed")
    setSubmitting(false)
  }

  function reset() {
    setStep("home"); setSelectedCourt(null); setSelectedSlot(null)
    setForm({ name: "", email: "", phone: "", notes: "" })
    setCreateAccount(false); setPassword("")
  }

  return (
    <div style={{ background: SPORTS_BG, minHeight: "100vh", color: "#f0f6ff", fontFamily: "sans-serif" }}>
      <ChatWidget businessId={business.id} businessName={business.name} />

      {/* ── HEADER AgendaMok Sports ────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${SPORTS_BORDER}`, background: "rgba(13,27,42,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: SPORTS_ACCENT }}>
            <Calendar className="w-4 h-4" style={{ color: SPORTS_BG }} />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm font-black text-white">Agenda</span>
            <span className="text-sm font-black" style={{ color: SPORTS_ACCENT }}>Mok</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(56,189,248,0.12)", color: SPORTS_ACCENT, border: `1px solid ${SPORTS_BORDER}` }}>Sports</span>
        </div>
        {business.phone && (
          <a href={`tel:${business.phone}`} className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            <Phone className="w-3 h-3" /> {business.phone}
          </a>
        )}
      </div>

      {/* ── HERO (cover image del club) ────────────────── */}
      {step !== "confirmed" && (
        <div className="relative" style={{ height: 220 }}>
          {business.coverImage ? (
            <img src={business.coverImage} alt={business.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(13,27,42,0.8) 100%)` }} />
          )}
          {/* gradient fade to bg */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,27,42,0) 30%, rgba(13,27,42,0.5) 70%, rgba(13,27,42,1) 100%)" }} />
          {/* Club identity */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end gap-3">
            {business.logo ? (
              <div className="flex-shrink-0 rounded-2xl shadow-xl overflow-hidden" style={{ background: "white", padding: 5, border: `2px solid rgba(255,255,255,0.2)` }}>
                <img src={business.logo} alt={business.name} className="w-12 h-12 object-contain block" style={{ borderRadius: 10 }} />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-xl text-xl font-black text-white" style={{ background: SPORTS_CARD, border: `2px solid ${SPORTS_BORDER}` }}>
                {business.name[0]}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black leading-tight text-white">{business.name}</h1>
              {(business.address || business.city) && (
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                  <MapPin className="w-3 h-3 flex-shrink-0" />{[business.address, business.city].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH + RESULTS ───────────────────────────── */}
      {(step === "home" || step === "court") && (
        <div className="max-w-lg mx-auto px-4 pb-24">

          {/* Search card */}
          <div className="rounded-2xl p-4 mt-4 space-y-4" style={{ background: SPORTS_CARD, border: `1px solid ${SPORTS_BORDER}` }}>

            {/* Sport tabs */}
            {sports.length > 1 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: SPORTS_ACCENT }}>Deporte</p>
                <div className="flex gap-2 flex-wrap">
                  {sports.map(s => (
                    <button key={s} onClick={() => setSelectedSport(s)}
                      className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                      style={selectedSport === s
                        ? { background: SPORTS_ACCENT, color: SPORTS_BG }
                        : { background: "rgba(56,189,248,0.08)", color: "rgba(255,255,255,0.5)", border: `1px solid ${SPORTS_BORDER}` }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: SPORTS_ACCENT }}>Duración</p>
              <div className="flex gap-2">
                {[60, 90, 120].map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={duration === d
                      ? { background: SPORTS_ACCENT, color: SPORTS_BG }
                      : { background: "rgba(56,189,248,0.07)", color: "rgba(255,255,255,0.45)", border: `1px solid ${SPORTS_BORDER}` }}>
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Date picker */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: SPORTS_ACCENT }}>Fecha</p>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                  style={{ background: "rgba(56,189,248,0.1)", color: SPORTS_ACCENT }}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <p className="flex-1 text-center text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {format(weekDays[0], "d MMM", { locale: es })} — {format(weekDays[6], "d MMM", { locale: es })}
                </p>
                <button onClick={() => setWeekOffset(w => w + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "rgba(56,189,248,0.1)", color: SPORTS_ACCENT }}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => {
                  const key = format(day, "yyyy-MM-dd")
                  const isPast = day < today
                  const isSelected = key === selectedDate
                  return (
                    <button key={key} disabled={isPast} onClick={() => setSelectedDate(key)}
                      className="flex flex-col items-center py-2.5 rounded-xl transition-all disabled:opacity-25"
                      style={isSelected
                        ? { background: SPORTS_ACCENT, color: SPORTS_BG }
                        : { background: "rgba(56,189,248,0.07)", color: "rgba(255,255,255,0.5)", border: `1px solid ${SPORTS_BORDER}` }}>
                      <span className="text-[8px] font-bold uppercase tracking-wide leading-none mb-1">{format(day, "EEE", { locale: es })}</span>
                      <span className="text-sm font-bold">{format(day, "d")}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button onClick={search} disabled={searching}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: SPORTS_ACCENT, color: SPORTS_BG }}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? "Buscando..." : "Buscar canchas disponibles"}
            </button>
          </div>

          {/* Results */}
          <div className="mt-5 space-y-3">
            {searching && (
              <div className="flex items-center justify-center gap-2 py-10" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: SPORTS_ACCENT }} />
                <span className="text-sm">Buscando disponibilidad...</span>
              </div>
            )}

            {!searching && hasSearched && (
              <>
                {results.filter(c => c.slots.length > 0).length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Sin canchas disponibles</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Prueba otro día o duración</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold uppercase tracking-widest capitalize px-1" style={{ color: SPORTS_ACCENT }}>
                      {format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })} · {duration} min
                    </p>
                    {results.filter(c => c.slots.length > 0).map(court => (
                      <div key={court.id} className="rounded-2xl overflow-hidden" style={{ background: SPORTS_CARD, border: `1px solid ${SPORTS_BORDER}` }}>
                        {/* Color bar */}
                        <div className="h-1" style={{ background: court.color }} />
                        {/* Court header */}
                        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-white">{court.name}</p>
                            {court.slots[0]?.price > 0 && (
                              <p className="text-xs mt-0.5 font-semibold" style={{ color: SPORTS_ACCENT }}>
                                desde ${Math.min(...court.slots.map(s => s.price)).toLocaleString("es-CL")}/hr
                              </p>
                            )}
                          </div>
                          {court.sponsorLogo && (
                            <img src={court.sponsorLogo} alt={court.sponsorName || ""}
                              className="h-9 w-auto max-w-[72px] object-contain flex-shrink-0 rounded"
                              style={{ background: "white", padding: "4px" }} />
                          )}
                        </div>
                        {/* Time slots */}
                        <div className="px-4 pb-4 grid grid-cols-4 gap-1.5">
                          {court.slots.map(slot => (
                            <button key={slot.time}
                              onClick={() => {
                                setSelectedCourt(court); setSelectedSlot(slot)
                                setStep("form"); window.scrollTo({ top: 0, behavior: "smooth" })
                              }}
                              className="py-2.5 px-1 rounded-xl text-sm font-bold transition-all flex flex-col items-center gap-0.5 hover:scale-105"
                              style={{ background: "rgba(56,189,248,0.1)", color: SPORTS_ACCENT, border: `1px solid rgba(56,189,248,0.2)` }}>
                              <span>{slot.time}</span>
                              {slot.price > 0 && <span className="text-[9px] font-normal opacity-70">${slot.price.toLocaleString("es-CL")}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {!hasSearched && (
              <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.2)" }}>
                Selecciona fecha y presiona buscar
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── FORM ───────────────────────────────────────── */}
      {step === "form" && selectedCourt && selectedSlot && (
        <div className="max-w-lg mx-auto">
          <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3" style={{ background: `${SPORTS_BG}ee`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${SPORTS_BORDER}` }}>
            <button onClick={() => setStep("home")} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: "rgba(56,189,248,0.1)", color: SPORTS_ACCENT }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCourt.color }} />
              <div className="min-w-0">
                <p className="text-sm font-bold truncate text-white">{selectedCourt.name}</p>
                <p className="text-xs truncate" style={{ color: SPORTS_ACCENT }}>
                  {format(parseISO(selectedDate), "d MMM", { locale: es })} · {selectedSlot.time} · {duration} min
                </p>
              </div>
            </div>
            {selectedCourt.sponsorLogo && (
              <img src={selectedCourt.sponsorLogo} alt={selectedCourt.sponsorName || ""} className="h-7 w-auto max-w-[56px] object-contain flex-shrink-0 rounded" style={{ background: "white", padding: "3px" }} />
            )}
          </div>

          <div className="px-4 pb-10 pt-5 space-y-5">
            {/* Summary */}
            <div className="rounded-2xl p-4 space-y-2.5" style={{ background: SPORTS_CARD, border: `1px solid ${SPORTS_BORDER}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCourt.color }} />
                <span className="font-bold text-sm text-white">{selectedCourt.name}</span>
                {selectedSlot.price > 0 && (
                  <span className="ml-auto font-bold text-sm" style={{ color: SPORTS_ACCENT }}>${selectedSlot.price.toLocaleString("es-CL")}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                <Clock className="w-3.5 h-3.5" /> {duration} min
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                <Calendar className="w-3.5 h-3.5" />
                {format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })} a las {selectedSlot.time}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: SPORTS_ACCENT }}>Tus datos</p>
              {[
                { key: "name", label: "Nombre completo", type: "text", placeholder: "María González" },
                { key: "phone", label: "Teléfono (opcional)", type: "tel", placeholder: "+56 9 1234 5678" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</label>
                  <input type={type} value={(form as Record<string, string>)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:opacity-25 transition-all"
                    style={{ background: SPORTS_CARD, border: `1px solid ${SPORTS_BORDER}`, color: "#f0f6ff" }} />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Email</label>
                <input type="email" value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailExists(false) }}
                  onBlur={async e => {
                    const email = e.target.value.trim()
                    if (!email || !email.includes("@")) return
                    const r = await fetch(`/api/book/${slug}/check-email?email=${encodeURIComponent(email)}`)
                    const d = await r.json()
                    setEmailExists(d.exists)
                  }}
                  placeholder="tu@email.com"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:opacity-25 transition-all"
                  style={{ background: SPORTS_CARD, border: `1px solid ${SPORTS_BORDER}`, color: "#f0f6ff" }} />
              </div>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3} placeholder="Comentario (opcional)"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none placeholder:opacity-25"
                style={{ background: SPORTS_CARD, border: `1px solid ${SPORTS_BORDER}`, color: "#f0f6ff" }} />
            </div>

            {/* Account creation / already registered */}
            {emailExists ? (
              <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: "rgba(56,189,248,0.06)", border: `1px solid ${SPORTS_ACCENT}40` }}>
                <Check className="w-4 h-4 flex-shrink-0" style={{ color: SPORTS_ACCENT }} />
                <div>
                  <p className="text-sm font-bold text-white">Ya tienes cuenta</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Tu reserva quedará asociada a tu perfil automáticamente</p>
                </div>
              </div>
            ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${createAccount ? SPORTS_ACCENT + "50" : SPORTS_BORDER}`, background: createAccount ? "rgba(56,189,248,0.05)" : SPORTS_CARD }}>
              <button
                type="button"
                onClick={() => setCreateAccount(v => !v)}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left transition-all"
              >
                <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
                  style={{ background: createAccount ? SPORTS_ACCENT : "rgba(56,189,248,0.1)", border: `1.5px solid ${createAccount ? SPORTS_ACCENT : SPORTS_BORDER}` }}>
                  {createAccount && <Check className="w-3 h-3" style={{ color: SPORTS_BG }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">Crear cuenta gratis</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Accede a tu historial, cancela reservas y acumula beneficios</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(56,189,248,0.12)", color: SPORTS_ACCENT }}>Gratis</span>
              </button>

              {createAccount && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="h-px" style={{ background: SPORTS_BORDER }} />
                  <p className="text-[11px] pt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                    ✓ Reservas guardadas &nbsp;·&nbsp; ✓ Cancelación online &nbsp;·&nbsp; ✓ Acceso prioritario
                  </p>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Crea una contraseña (mín. 6 caracteres)"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:opacity-30 mt-1"
                    style={{ background: "rgba(56,189,248,0.07)", border: `1px solid ${SPORTS_BORDER}`, color: "#f0f6ff" }}
                  />
                </div>
              )}
            </div>
            )}

            <button onClick={handleConfirm} disabled={submitting || !form.name || !form.email || (!emailExists && createAccount && password.length > 0 && password.length < 6)}
              className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              style={{ background: SPORTS_ACCENT, color: SPORTS_BG }}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Confirmando...</> : "Confirmar reserva →"}
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRMED ──────────────────────────────────── */}
      {step === "confirmed" && selectedCourt && selectedSlot && (
        <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Check className="w-12 h-12" style={{ color: "#22c55e" }} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">¡Reserva confirmada!</h2>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>Enviamos la confirmación a {form.email}</p>
          </div>
          <div className="w-full rounded-2xl p-5 space-y-3 text-left" style={{ background: SPORTS_CARD, border: `1px solid ${SPORTS_BORDER}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCourt.color }} />
              <span className="font-bold text-sm text-white">{selectedCourt.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Clock className="w-4 h-4" /> {duration} min
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Calendar className="w-4 h-4" />
              {format(parseISO(selectedDate), "EEEE d 'de' MMMM yyyy", { locale: es })} · {selectedSlot.time}
            </div>
            {(business.address || business.city) && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <MapPin className="w-4 h-4" />
                {[business.address, business.city].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
          <a href={`https://wa.me/?text=${encodeURIComponent(`*${business.name}*\n📅 ${format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })}\n⏰ ${selectedSlot.time} · ${duration} min\n🎾 ${selectedCourt.name}${selectedSlot.price > 0 ? `\n💵 $${selectedSlot.price.toLocaleString("es-CL")}` : ""}\n\n_Reservado con AgendaMok Sports_`)}`}
            target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "rgba(56,189,248,0.1)", color: SPORTS_ACCENT, border: `1px solid ${SPORTS_BORDER}` }}>
            <Share2 className="w-4 h-4" /> Compartir por WhatsApp
          </a>

          <button onClick={reset} className="text-sm font-semibold" style={{ color: SPORTS_ACCENT }}>
            Reservar otra cancha →
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-2.5 flex items-center justify-center gap-1.5 pointer-events-none" style={{ background: `linear-gradient(to top, ${SPORTS_BG}, transparent)` }}>
        <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.15)" }}>Reservas por</span>
        <span className="text-[10px] font-black" style={{ color: "rgba(56,189,248,0.4)" }}>AgendaMok Sports</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// SERVICE BOOKING FLOW (regular businesses)
// ─────────────────────────────────────────────────────────────────

function ServiceBookingFlow({ business, slug }: { business: Business; slug: string }) {
  const brand = business.primaryColor || "#38bdf8"
  const today = startOfToday()

  const [step, setStep] = useState<Step>("home")
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [searchQ, setSearchQ] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const catBarRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [payMethod, setPayMethod] = useState<PayMethod>("local")
  const [submitting, setSubmitting] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i))

  useEffect(() => {
    if (!selectedDate || !selectedService) return
    setLoadingSlots(true)
    setSelectedTime("")
    const params = new URLSearchParams({ serviceId: selectedService.id, date: selectedDate })
    if (selectedStaff) params.set("staffId", selectedStaff.id)
    fetch(`/api/book/${slug}/availability?${params}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots || []))
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, selectedService, selectedStaff, slug])

  async function handleConfirm() {
    if (!selectedService || !selectedDate || !selectedTime) return
    if (!form.name || !form.email) return
    setSubmitting(true)
    const startTime = new Date(`${selectedDate}T${selectedTime}`).toISOString()
    const r = await fetch(`/api/book/${slug}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedService.id,
        staffId: selectedStaff?.id,
        startTime,
        clientName: form.name,
        clientEmail: form.email,
        clientPhone: form.phone || undefined,
        notes: form.notes || undefined,
      }),
    })
    if (!r.ok) {
      const d = await r.json()
      alert(d.error || "Error al confirmar")
      setSubmitting(false)
      return
    }
    if (payMethod === "online" && business.onlinePaymentsEnabled) {
      const apptData = await r.json()
      const payR = await fetch(`/api/book/${slug}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: apptData.appointment?.id,
          amount: selectedService.price,
          email: form.email,
          serviceName: selectedService.name,
        }),
      })
      if (payR.ok) {
        const payData = await payR.json()
        if (payData.url) { window.location.href = `${payData.url}?token=${payData.token}`; return }
      }
    }
    setStep("confirmed")
    setSubmitting(false)
  }

  function downloadIcs() {
    if (!selectedDate || !selectedTime || !selectedService || !business) return
    const [h, m] = selectedTime.split(":").map(Number)
    const dtStart = parseISO(selectedDate)
    dtStart.setHours(h, m, 0, 0)
    const dtEnd = new Date(dtStart.getTime() + selectedService.duration * 60000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//AgendaMok//ES","BEGIN:VEVENT",
      `DTSTART:${fmt(dtStart)}`,`DTEND:${fmt(dtEnd)}`,
      `SUMMARY:${selectedService.name} en ${business.name}`,
      "DESCRIPTION:Turno reservado via AgendaMok",
      business.address ? `LOCATION:${business.address}` : "",
      "END:VEVENT","END:VCALENDAR"].filter(Boolean).join("\r\n")
    const blob = new Blob([ics], { type: "text/calendar" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "turno.ics"; a.click()
    URL.revokeObjectURL(url)
  }

  function resetBooking() {
    setStep("home"); setSelectedService(null); setSelectedStaff(null)
    setSelectedDate(""); setSelectedTime(""); setSearchQ(""); setWeekOffset(0)
    setForm({ name: "", email: "", phone: "", notes: "" })
  }

  function pickService(s: Service) {
    setSelectedService(s)
    setStep("staff")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const categories: Category[] = []
  const seen = new Set<string>()
  for (const s of business.services) {
    if (s.category && !seen.has(s.category.id)) {
      seen.add(s.category.id)
      categories.push(s.category)
    }
  }
  categories.sort((a, b) => a.order - b.order)

  const filteredServices = business.services.filter(s => {
    const matchesSearch = !searchQ || s.name.toLowerCase().includes(searchQ.toLowerCase()) || s.description?.toLowerCase().includes(searchQ.toLowerCase())
    const matchesCat = activeCategory === "all" || s.categoryId === activeCategory
    return matchesSearch && matchesCat
  })

  const grouped: { cat: Category | null; services: Service[] }[] = []
  const noCategory = filteredServices.filter(s => !s.categoryId)
  if (noCategory.length > 0 && activeCategory === "all") grouped.push({ cat: null, services: noCategory })
  for (const cat of categories) {
    const svcs = filteredServices.filter(s => s.categoryId === cat.id)
    if (svcs.length > 0) grouped.push({ cat, services: svcs })
  }

  return (
    <div style={{ background: "#0f0f11", minHeight: "100vh", color: "#f4f4f5" }}>
      <ChatWidget businessId={business.id} businessName={business.name} />

      {step === "home" && (
        <>
          <div className="relative" style={{ height: 260 }}>
            {business.coverImage ? (
              <img src={business.coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${brand}22, ${brand}08)` }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(15,15,17,0.1) 0%, rgba(15,15,17,0.7) 70%, #0f0f11 100%)" }} />
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex items-end gap-4">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 shadow-xl" style={{ border: "2px solid rgba(255,255,255,0.15)" }} />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-xl" style={{ background: brand, border: "2px solid rgba(255,255,255,0.15)" }}>
                  <span className="text-2xl font-black text-white">{business.name[0]}</span>
                </div>
              )}
              <div className="pb-1">
                <h1 className="text-2xl font-black leading-tight">{business.name}</h1>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{business.category}</p>
              </div>
            </div>
          </div>

          <div className="px-5 pt-4 pb-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {(business.address || business.city) && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {[business.address, business.city].filter(Boolean).join(", ")}
              </span>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {business.phone}
              </a>
            )}
            {business.description && (
              <p className="w-full text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>{business.description}</p>
            )}
          </div>

          {business.staff.length > 0 && (
            <div className="mt-6">
              <h2 className="px-5 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Nuestro equipo</h2>
              <div className="flex gap-3 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {business.staff.map(s => (
                  <div key={s.id} className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: 72 }}>
                    {s.user.image ? (
                      <img src={s.user.image} alt={s.user.name || ""} className="w-14 h-14 rounded-full object-cover" style={{ border: `2.5px solid ${s.color}` }} />
                    ) : (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: s.color + "33", border: `2.5px solid ${s.color}` }}>
                        {s.user.name?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs font-semibold leading-tight" style={{ color: "#f4f4f5" }}>{s.user.name?.split(" ")[0]}</p>
                      {s.specialty && <p className="text-[10px] leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.specialty}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="px-5 text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>Servicios</h2>
            <div className="px-5 mb-4">
              <div className="flex items-center gap-2 px-3.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar servicio..."
                  className="flex-1 py-2.5 text-sm bg-transparent outline-none placeholder:text-white/30" style={{ color: "#f4f4f5" }} />
                {searchQ && <button onClick={() => setSearchQ("")}><X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} /></button>}
              </div>
            </div>
            {categories.length > 0 && (
              <div ref={catBarRef} className="flex gap-2 px-5 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: "none" }}>
                {[{ id: "all", name: "Todos" }, ...categories].map(cat => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                    className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                    style={activeCategory === cat.id
                      ? { background: brand, color: "#fff" }
                      : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            <div className="px-5 space-y-6 pb-24">
              {grouped.length === 0 && (
                <p className="text-sm py-8 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>Sin servicios que coincidan</p>
              )}
              {grouped.map(({ cat, services }) => (
                <div key={cat?.id ?? "uncategorized"}>
                  {cat && <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: brand }}>{cat.name}</h3>}
                  <div className="space-y-2">
                    {services.map(s => (
                      <ServiceCard key={s.id} service={s} brand={brand} onSelect={() => pickService(s)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 py-3 flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(to top, #0f0f11, transparent)", pointerEvents: "none" }}>
            <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.2)" }}>Reservas por</span>
            <span className="text-[10px] font-black" style={{ color: "rgba(255,255,255,0.35)" }}>AgendaMok</span>
          </div>
        </>
      )}

      {step === "staff" && selectedService && (
        <div className="max-w-lg mx-auto">
          <StepHeader brand={brand} onBack={() => setStep("home")} label={selectedService.name} sub={`${selectedService.duration} min · $${Number(selectedService.price).toLocaleString("es-CL")}`} color={selectedService.color} />
          <div className="px-5 pb-10 space-y-3">
            <h2 className="text-base font-bold mb-4">¿Con quién quieres atenderte?</h2>
            <button onClick={() => { setSelectedStaff(null); setStep("datetime") }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                <Star className="w-5 h-5" style={{ color: brand }} />
              </div>
              <div>
                <p className="font-semibold text-sm">Sin preferencia</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>El primer disponible</p>
              </div>
            </button>
            {business.staff.map(s => (
              <button key={s.id} onClick={() => { setSelectedStaff(s); setStep("datetime") }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {s.user.image ? (
                  <img src={s.user.image} alt={s.user.name || ""} className="w-12 h-12 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${s.color}` }} />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0" style={{ background: s.color + "33", border: `2px solid ${s.color}` }}>
                    {s.user.name?.[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{s.user.name}</p>
                  {s.specialty && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{s.specialty}</p>}
                  {s.bio && <p className="text-xs mt-1 line-clamp-2" style={{ color: "rgba(255,255,255,0.3)" }}>{s.bio}</p>}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "datetime" && selectedService && (
        <div className="max-w-lg mx-auto">
          <StepHeader brand={brand} onBack={() => setStep("staff")} label={selectedService.name} sub={selectedStaff ? `con ${selectedStaff.user.name}` : "cualquier profesional"} color={selectedService.color} />
          <div className="px-5 pb-10">
            <h2 className="text-base font-bold mb-5">Elige fecha y hora</h2>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="flex-1 text-center text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                {format(weekDays[0], "d MMM", { locale: es })} — {format(weekDays[6], "d MMM yyyy", { locale: es })}
              </p>
              <button onClick={() => setWeekOffset(w => w + 1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-6">
              {weekDays.map(day => {
                const key = format(day, "yyyy-MM-dd")
                const isPast = day < today
                const isSelected = key === selectedDate
                return (
                  <button key={key} disabled={isPast} onClick={() => setSelectedDate(key)}
                    className="flex flex-col items-center py-3 rounded-2xl transition-all disabled:opacity-25"
                    style={isSelected ? { background: brand, color: "#fff" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wide leading-none mb-1.5">{format(day, "EEE", { locale: es })}</span>
                    <span className="text-sm font-bold">{format(day, "d")}</span>
                  </button>
                )
              })}
            </div>
            {selectedDate && (
              <>
                <p className="text-xs font-semibold mb-3 capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                {loadingSlots ? (
                  <div className="flex items-center justify-center gap-2 py-10" style={{ color: "rgba(255,255,255,0.3)" }}>
                    <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Buscando horarios...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Sin horarios disponibles</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Prueba otro día</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button key={slot} onClick={() => { setSelectedTime(slot); setStep("form"); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                        className="py-3 rounded-xl text-sm font-semibold transition-all"
                        style={selectedTime === slot
                          ? { background: brand, color: "#fff" }
                          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {step === "form" && selectedService && (
        <div className="max-w-lg mx-auto">
          <StepHeader brand={brand} onBack={() => setStep("datetime")} label={selectedService.name} sub={`${selectedDate ? format(parseISO(selectedDate), "d MMM", { locale: es }) : ""} · ${selectedTime}`} color={selectedService.color} />
          <div className="px-5 pb-10 space-y-6">
            <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedService.color }} />
                <span className="font-bold text-sm">{selectedService.name}</span>
                <span className="ml-auto font-bold text-sm" style={{ color: brand }}>${Number(selectedService.price).toLocaleString("es-CL")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <Clock className="w-3.5 h-3.5" /> {selectedService.duration} min
                {selectedStaff && <><span style={{ color: "rgba(255,255,255,0.2)" }}>·</span><User className="w-3.5 h-3.5" /> {selectedStaff.user.name}</>}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate && format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime}
              </div>
            </div>
            {business.onlinePaymentsEnabled && Number(selectedService.price) > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Forma de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "local" as PayMethod, label: "En el local", sub: "Efectivo o tarjeta" },
                    { value: "online" as PayMethod, label: "Pagar ahora", sub: `$${Number(selectedService.price).toLocaleString("es-CL")}` },
                  ]).map(opt => (
                    <button key={opt.value} onClick={() => setPayMethod(opt.value)}
                      className="p-3.5 rounded-2xl text-left transition-all"
                      style={payMethod === opt.value
                        ? { background: brand + "20", border: `1.5px solid ${brand}` }
                        : { background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-sm font-semibold" style={{ color: payMethod === opt.value ? brand : "rgba(255,255,255,0.8)" }}>{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Tus datos</label>
              {[
                { key: "name", label: "Nombre completo", type: "text", placeholder: "María González" },
                { key: "email", label: "Email", type: "email", placeholder: "tu@email.com" },
                { key: "phone", label: "Teléfono (opcional)", type: "tel", placeholder: "+56 9 1234 5678" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</label>
                  <input type={type} value={(form as Record<string, string>)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all placeholder:text-white/25"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#f4f4f5" }} />
                </div>
              ))}
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3} placeholder="Comentario para el profesional (opcional)"
                className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none resize-none placeholder:text-white/20"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#f4f4f5" }} />
            </div>
            <button onClick={handleConfirm} disabled={submitting || !form.name || !form.email}
              className="w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: brand, color: "#fff" }}>
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />{payMethod === "online" ? "Redirigiendo al pago..." : "Confirmando..."}</>
                : payMethod === "online" && business.onlinePaymentsEnabled
                  ? `Pagar $${Number(selectedService.price).toLocaleString("es-CL")} →`
                  : "Confirmar reserva →"}
            </button>
          </div>
        </div>
      )}

      {step === "confirmed" && (
        <div className="max-w-lg mx-auto px-5 py-16 flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
            <Check className="w-12 h-12" style={{ color: "#22c55e" }} />
          </div>
          <div>
            <h2 className="text-2xl font-black">¡Reserva confirmada!</h2>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>Enviamos la confirmación a {form.email}</p>
          </div>
          <div className="w-full rounded-2xl p-5 space-y-3 text-left" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedService?.color }} />
              <span className="font-bold text-sm">{selectedService?.name}</span>
            </div>
            {selectedStaff && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <User className="w-4 h-4" /> {selectedStaff.user.name}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Calendar className="w-4 h-4" />
              {selectedDate && format(parseISO(selectedDate), "EEEE d 'de' MMMM yyyy", { locale: es })} · {selectedTime}
            </div>
            {(business.address || business.city) && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <MapPin className="w-4 h-4" />
                {[business.address, business.city].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={downloadIcs}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Download className="w-4 h-4" /> Calendario
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Reservé ${selectedService?.name} en ${business.name} — ${selectedDate ? format(parseISO(selectedDate), "d MMM", { locale: es }) : ""} ${selectedTime} 🗓️`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Share2 className="w-4 h-4" /> Compartir
            </a>
          </div>
          <button onClick={resetBooking} className="text-sm font-semibold" style={{ color: brand }}>
            Reservar otro turno →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function ServiceCard({ service, brand, onSelect }: { service: Service; brand: string; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasDesc = !!service.description
  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <button className="w-full flex items-center gap-4 p-4 text-left" onClick={() => hasDesc ? setExpanded(e => !e) : onSelect()}>
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{service.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}><Clock className="w-3 h-3 inline mr-1" />{service.duration} min</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-sm" style={{ color: brand }}>${Number(service.price).toLocaleString("es-CL")}</span>
          {hasDesc && (
            <ChevronDown className="w-4 h-4 transition-transform" style={{ color: "rgba(255,255,255,0.25)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
          )}
        </div>
      </button>
      {expanded && hasDesc && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs pt-3" style={{ color: "rgba(255,255,255,0.45)" }}>{service.description}</p>
          <button onClick={onSelect}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: brand, color: "#fff" }}>
            Reservar
          </button>
        </div>
      )}
    </div>
  )
}

function StepHeader({ brand, onBack, label, sub, color }: { brand: string; onBack: () => void; label: string; sub: string; color: string }) {
  return (
    <div className="sticky top-0 z-20 px-5 py-4 flex items-center gap-3" style={{ background: "rgba(15,15,17,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all" style={{ background: "rgba(255,255,255,0.07)" }}>
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{label}</p>
          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>
        </div>
      </div>
    </div>
  )
}
