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
type PricingRule = { days: number[]; startTime: string; endTime: string; price: number; fixedSlots: string[] }
type Court = { id: string; name: string; sport: string | null; color: string; description: string | null; sponsorName: string | null; sponsorLogo: string | null; sponsorUrl: string | null; pricingRules: PricingRule[] }
type Business = {
  id: string; name: string; category: string; description: string | null
  logo: string | null; coverImage: string | null; coverImagePositionY: number | null; phone: string | null
  address: string | null; city: string | null
  onlinePaymentsEnabled: boolean; primaryColor: string | null
  businessType: string
  chatBotEnabled: boolean
  clubSettings: { bookingWindowDays: number } | null
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

type CourtResult = Court & { slots: { time: string; price: number; paymentPlayers: number }[] }

function CourtBookingFlow({ business, slug }: { business: Business; slug: string }) {
  const today = startOfToday()

  // Search state
  const sports = [...new Set(business.courts.map(c => c.sport).filter(Boolean))] as string[]
  const [selectedSports, setSelectedSports] = useState<string[]>(sports.length > 0 ? [sports[0]] : [])
  const [selectedDate, setSelectedDate] = useState(format(today, "yyyy-MM-dd"))
  const [weekOffset, setWeekOffset] = useState(0)

  // Derive available durations from fixedSlots of courts matching selected sports
  const availableDurations = React.useMemo(() => {
    const activeCourts = selectedSports.length > 0
      ? business.courts.filter(c => c.sport && selectedSports.includes(c.sport))
      : business.courts
    const durations = new Set<number>()
    for (const court of activeCourts) {
      for (const rule of court.pricingRules) {
        if (rule.fixedSlots && rule.fixedSlots.length >= 2) {
          const [h1, m1] = rule.fixedSlots[0].split(":").map(Number)
          const [h2, m2] = rule.fixedSlots[1].split(":").map(Number)
          durations.add((h2 * 60 + m2) - (h1 * 60 + m1))
        } else {
          // No fixed slots — offer standard options
          durations.add(60); durations.add(90); durations.add(120)
        }
      }
    }
    const sorted = [...durations].sort((a, b) => a - b)
    return sorted.length > 0 ? sorted : [60, 90, 120]
  }, [selectedSports, business.courts])

  const [duration, setDuration] = useState(availableDurations[0])

  // Reset duration when available options change and current is no longer valid
  useEffect(() => {
    if (!availableDurations.includes(duration)) setDuration(availableDurations[0])
  }, [availableDurations, duration])

  // Results state
  const [results, setResults] = useState<CourtResult[]>([])
  const [searching, setSearching] = useState(false)

  // Booking state
  const [selectedCourt, setSelectedCourt] = useState<CourtResult | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; price: number; paymentPlayers: number } | null>(null)
  const [courtPayMethod, setCourtPayMethod] = useState<"local" | "online">("local")
  const [step, setStep] = useState<CourtStep>("home")
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [createAccount, setCreateAccount] = useState(false)
  const [password, setPassword] = useState("")
  const [emailExists, setEmailExists] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null)
  const [allowTransfer, setAllowTransfer] = useState(false)
  const [voucherUploading, setVoucherUploading] = useState(false)
  const [voucherUploaded, setVoucherUploaded] = useState(false)

  const bookingWindowDays = business.clubSettings?.bookingWindowDays ?? 30
  const maxDate = addDays(today, bookingWindowDays - 1)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i))
  const maxWeekOffset = Math.floor(bookingWindowDays / 7)

  async function search() {
    setSearching(true)
    const multiSport = selectedSports.length > 1
    const params = new URLSearchParams({ date: selectedDate, duration: multiSport ? "0" : String(duration) })
    if (selectedSports.length > 0) params.set("sport", selectedSports.join(","))
    const r = await fetch(`/api/book/${slug}/courts/availability?${params}`)
    const d = await r.json()
    setResults(d.courts || [])
    setSearching(false)
  }

  // Auto-search on mount and when date/sport/duration changes
  useEffect(() => {
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedSports, duration])

  async function handleConfirm() {
    if (!selectedCourt || !selectedSlot || !form.name || !form.email) return
    setSubmitting(true)

    // Online payment path
    if (courtPayMethod === "online" && business.onlinePaymentsEnabled && selectedSlot.price > 0) {
      const r = await fetch(`/api/book/${slug}/courts/pay`, {
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
          paymentPlayers: selectedSlot.paymentPlayers,
        }),
      })
      const d = await r.json()
      if (!r.ok) { alert(d.error || "Error al iniciar pago"); setSubmitting(false); return }
      if (createAccount && password.length >= 6) {
        await fetch(`/api/book/${slug}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, email: form.email, password }),
        })
      }
      window.location.href = d.url
      return
    }

    // Local payment path
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
    const d = await r.json()
    if (!r.ok) {
      alert(d.error || "Error al confirmar")
      setSubmitting(false)
      return
    }
    if (createAccount && password.length >= 6) {
      await fetch(`/api/book/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password }),
      })
    }

    setConfirmedBookingId(d.booking?.id || null)
    setAllowTransfer(d.allowTransfer || false)
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
      {business.chatBotEnabled && <ChatWidget businessId={business.id} businessName={business.name} />}

      {/* ── HEADER AgendaMok Sports ────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${SPORTS_BORDER}`, background: "rgba(13,27,42,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-2">
          <img src="/agendamok-icon.png" alt="AgendaMok" className="w-8 h-8 flex-shrink-0" />
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
        <div className="relative w-full" style={{ aspectRatio: "3/1" }}>
          {business.coverImage ? (
            <img src={business.coverImage} alt={business.name} className="w-full h-full object-cover" style={{ objectPosition: `center ${business.coverImagePositionY ?? 50}%` }} />
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
                  {sports.map(s => {
                    const active = selectedSports.includes(s)
                    return (
                      <button key={s} onClick={() => setSelectedSports(prev =>
                        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                      )}
                        className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                        style={active
                          ? { background: SPORTS_ACCENT, color: SPORTS_BG }
                          : { background: "rgba(56,189,248,0.08)", color: "rgba(255,255,255,0.5)", border: `1px solid ${SPORTS_BORDER}` }}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Duration — only shown when a single sport is selected */}
            {selectedSports.length <= 1 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: SPORTS_ACCENT }}>Duración</p>
                <div className="flex gap-2">
                  {availableDurations.map(d => (
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
            )}

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
                <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= maxWeekOffset}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                  style={{ background: "rgba(56,189,248,0.1)", color: SPORTS_ACCENT }}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => {
                  const key = format(day, "yyyy-MM-dd")
                  const isPast = day < today
                  const isOutOfWindow = day > maxDate
                  const isSelected = key === selectedDate
                  return (
                    <button key={key} disabled={isPast || isOutOfWindow} onClick={() => setSelectedDate(key)}
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

          </div>

          {/* Results */}
          <div className="mt-5 space-y-3">
            {searching && (
              <div className="flex items-center justify-center gap-2 py-10" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: SPORTS_ACCENT }} />
                <span className="text-sm">Buscando disponibilidad...</span>
              </div>
            )}

            {!searching && (
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

            {/* Payment method selector (only if online payments enabled and price > 0) */}
            {business.onlinePaymentsEnabled && selectedSlot.price > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: SPORTS_ACCENT }}>Forma de pago</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "local" as const, label: "Pagar en cancha", sub: "Efectivo o tarjeta" },
                    {
                      value: "online" as const,
                      label: "Pagar ahora",
                      sub: `$${Math.round(selectedSlot.price / Math.max(1, selectedSlot.paymentPlayers)).toLocaleString("es-CL")} con tarjeta`,
                    },
                  ]).map(opt => (
                    <button key={opt.value} type="button" onClick={() => setCourtPayMethod(opt.value)}
                      className="py-3 px-3 rounded-xl text-left transition-all"
                      style={courtPayMethod === opt.value
                        ? { background: "rgba(56,189,248,0.15)", border: `1.5px solid ${SPORTS_ACCENT}`, color: "#f0f6ff" }
                        : { background: SPORTS_CARD, border: `1px solid ${SPORTS_BORDER}`, color: "rgba(255,255,255,0.4)" }}>
                      <p className="text-xs font-bold leading-none text-white">{opt.label}</p>
                      <p className="text-[10px] mt-0.5 opacity-60">{opt.sub}</p>
                    </button>
                  ))}
                </div>
                {courtPayMethod === "online" && selectedSlot.paymentPlayers > 1 && (
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Pagas tu parte ({selectedSlot.paymentPlayers === 2 ? "50%" : "25%"}) · El resto lo pagan los otros jugadores
                  </p>
                )}
              </div>
            )}

            <button onClick={handleConfirm} disabled={submitting || !form.name || !form.email || (!emailExists && createAccount && password.length > 0 && password.length < 6)}
              className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              style={{ background: SPORTS_ACCENT, color: SPORTS_BG }}>
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />{courtPayMethod === "online" ? "Redirigiendo al pago..." : "Confirmando..."}</>
                : courtPayMethod === "online" && business.onlinePaymentsEnabled && selectedSlot.price > 0
                  ? `Pagar $${Math.round(selectedSlot.price / Math.max(1, selectedSlot.paymentPlayers)).toLocaleString("es-CL")} →`
                  : "Confirmar reserva →"}
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
          {/* Pago por transferencia */}
          {allowTransfer && confirmedBookingId && (
            <div className="w-full rounded-2xl p-5 space-y-3 text-left" style={{ background: SPORTS_CARD, border: `1px solid ${SPORTS_BORDER}` }}>
              <p className="text-sm font-bold text-white flex items-center gap-2">🏦 Adjunta tu comprobante de transferencia</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>El club validará el pago una vez recibido el comprobante.</p>
              {voucherUploaded ? (
                <div className="flex items-center gap-2 py-2 px-3 rounded-xl" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
                  <Check className="w-4 h-4" style={{ color: "#22c55e" }} />
                  <span className="text-sm font-semibold" style={{ color: "#22c55e" }}>Comprobante enviado</span>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" disabled={voucherUploading}
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setVoucherUploading(true)
                      const fd = new FormData()
                      fd.append("file", file)
                      const r = await fetch(`/api/businesses/${business.id}/court-bookings/${confirmedBookingId}/voucher`, { method: "POST", body: fd })
                      setVoucherUploading(false)
                      if (r.ok) setVoucherUploaded(true)
                      else alert("Error al subir comprobante. Intenta de nuevo.")
                    }} />
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "rgba(56,189,248,0.1)", color: SPORTS_ACCENT, border: `1px solid ${SPORTS_BORDER}`, opacity: voucherUploading ? 0.6 : 1 }}>
                    {voucherUploading ? "Subiendo…" : "📎 Subir comprobante"}
                  </div>
                </label>
              )}
            </div>
          )}

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

  // Light theme palette
  const BG = "#f8fafc"
  const CARD = "#ffffff"
  const BORDER = "#e2e8f0"
  const TEXT = "#0f172a"
  const MUTED = "#64748b"
  const SUBTLE = "#f1f5f9"

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "sans-serif" }}>
      {business.chatBotEnabled && <ChatWidget businessId={business.id} businessName={business.name} />}

      {step === "home" && (
        <>
          {/* Hero */}
          <div className="relative w-full" style={{ aspectRatio: "3/1" }}>
            {business.coverImage ? (
              <img src={business.coverImage} alt="" className="w-full h-full object-cover" style={{ objectPosition: `center ${business.coverImagePositionY ?? 50}%` }} />
            ) : (
              <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${brand}18 0%, #e0f2fe 100%)` }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 100%)" }} />
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex items-end gap-4">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 shadow-lg" style={{ border: "2px solid rgba(255,255,255,0.9)" }} />
              ) : (
                <div className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg" style={{ background: brand, border: "2px solid rgba(255,255,255,0.9)" }}>
                  <span className="text-xl font-black text-white">{business.name[0]}</span>
                </div>
              )}
              <div className="pb-0.5">
                <h1 className="text-xl font-black leading-tight text-white drop-shadow-sm">{business.name}</h1>
                <p className="text-xs mt-0.5 text-white/70">{business.category}</p>
              </div>
            </div>
          </div>

          {/* Info strip */}
          <div className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-1" style={{ borderBottom: `1px solid ${BORDER}` }}>
            {(business.address || business.city) && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {[business.address, business.city].filter(Boolean).join(", ")}
              </span>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
                <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {business.phone}
              </a>
            )}
            {business.description && (
              <p className="w-full text-sm mt-1" style={{ color: MUTED }}>{business.description}</p>
            )}
          </div>

          {/* Team */}
          {business.staff.length > 0 && (
            <div className="mt-5 px-5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Nuestro equipo</h2>
              <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {business.staff.map(s => (
                  <div key={s.id} className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: 68 }}>
                    {s.user.image ? (
                      <img src={s.user.image} alt={s.user.name || ""} className="w-12 h-12 rounded-full object-cover shadow-sm" style={{ border: `2.5px solid ${s.color}` }} />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white shadow-sm" style={{ background: s.color }}>
                        {s.user.name?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs font-semibold leading-tight" style={{ color: TEXT }}>{s.user.name?.split(" ")[0]}</p>
                      {s.specialty && <p className="text-[10px] leading-tight mt-0.5" style={{ color: MUTED }}>{s.specialty}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          <div className="mt-5">
            <div className="px-5 mb-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Servicios</h2>
              <div className="flex items-center gap-2 px-3.5 rounded-xl" style={{ background: SUBTLE, border: `1px solid ${BORDER}` }}>
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar servicio..."
                  className="flex-1 py-2.5 text-sm bg-transparent outline-none"
                  style={{ color: TEXT }}
                  placeholder-style={{ color: MUTED }} />
                {searchQ && <button onClick={() => setSearchQ("")}><X className="w-4 h-4" style={{ color: MUTED }} /></button>}
              </div>
            </div>
            {categories.length > 0 && (
              <div ref={catBarRef} className="flex gap-2 px-5 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: "none" }}>
                {[{ id: "all", name: "Todos" }, ...categories].map(cat => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                    className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                    style={activeCategory === cat.id
                      ? { background: brand, color: "#fff" }
                      : { background: SUBTLE, color: MUTED, border: `1px solid ${BORDER}` }}>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            <div className="px-5 space-y-5 pb-24">
              {grouped.length === 0 && (
                <p className="text-sm py-8 text-center" style={{ color: MUTED }}>Sin servicios que coincidan</p>
              )}
              {grouped.map(({ cat, services }) => (
                <div key={cat?.id ?? "uncategorized"}>
                  {cat && <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: brand }}>{cat.name}</h3>}
                  <div className="space-y-2">
                    {services.map(s => (
                      <ServiceCard key={s.id} service={s} brand={brand} onSelect={() => pickService(s)} card={CARD} border={BORDER} muted={MUTED} text={TEXT} subtle={SUBTLE} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 py-3 flex items-center justify-center gap-1.5 pointer-events-none" style={{ background: `linear-gradient(to top, ${BG} 60%, transparent)` }}>
            <span className="text-[10px] font-medium" style={{ color: "#94a3b8" }}>Reservas por</span>
            <span className="text-[10px] font-black" style={{ color: brand }}>AgendaMok</span>
          </div>
        </>
      )}

      {step === "staff" && selectedService && (
        <div className="max-w-lg mx-auto">
          <StepHeader brand={brand} onBack={() => setStep("home")} label={selectedService.name} sub={`${selectedService.duration} min · $${Number(selectedService.price).toLocaleString("es-CL")}`} color={selectedService.color} bg={BG} border={BORDER} muted={MUTED} text={TEXT} subtle={SUBTLE} />
          <div className="px-5 pb-10 space-y-2.5 pt-2">
            <p className="text-sm font-bold mb-3" style={{ color: TEXT }}>¿Con quién quieres atenderte?</p>
            <button onClick={() => { setSelectedStaff(null); setStep("datetime") }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: brand + "15" }}>
                <Star className="w-5 h-5" style={{ color: brand }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: TEXT }}>Sin preferencia</p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>El primer disponible</p>
              </div>
            </button>
            {business.staff.map(s => (
              <button key={s.id} onClick={() => { setSelectedStaff(s); setStep("datetime") }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                {s.user.image ? (
                  <img src={s.user.image} alt={s.user.name || ""} className="w-11 h-11 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${s.color}` }} />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0" style={{ background: s.color }}>
                    {s.user.name?.[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: TEXT }}>{s.user.name}</p>
                  {s.specialty && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{s.specialty}</p>}
                  {s.bio && <p className="text-xs mt-1 line-clamp-2" style={{ color: MUTED }}>{s.bio}</p>}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BORDER }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "datetime" && selectedService && (
        <div className="max-w-lg mx-auto">
          <StepHeader brand={brand} onBack={() => setStep("staff")} label={selectedService.name} sub={selectedStaff ? `con ${selectedStaff.user.name}` : "cualquier profesional"} color={selectedService.color} bg={BG} border={BORDER} muted={MUTED} text={TEXT} subtle={SUBTLE} />
          <div className="px-5 pb-10 pt-2">
            <p className="text-sm font-bold mb-4" style={{ color: TEXT }}>Elige fecha y hora</p>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: SUBTLE, border: `1px solid ${BORDER}`, color: MUTED }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="flex-1 text-center text-xs font-medium" style={{ color: MUTED }}>
                {format(weekDays[0], "d MMM", { locale: es })} — {format(weekDays[6], "d MMM yyyy", { locale: es })}
              </p>
              <button onClick={() => setWeekOffset(w => w + 1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: SUBTLE, border: `1px solid ${BORDER}`, color: MUTED }}>
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
                    className="flex flex-col items-center py-2.5 rounded-xl transition-all disabled:opacity-30"
                    style={isSelected
                      ? { background: brand, color: "#fff" }
                      : { background: SUBTLE, color: MUTED, border: `1px solid ${BORDER}` }}>
                    <span className="text-[9px] font-bold uppercase tracking-wide leading-none mb-1">{format(day, "EEE", { locale: es })}</span>
                    <span className="text-sm font-bold">{format(day, "d")}</span>
                  </button>
                )
              })}
            </div>
            {selectedDate && (
              <>
                <p className="text-xs font-semibold mb-3 capitalize" style={{ color: MUTED }}>
                  {format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                {loadingSlots ? (
                  <div className="flex items-center justify-center gap-2 py-10" style={{ color: MUTED }}>
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: brand }} /><span className="text-sm">Buscando horarios...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm" style={{ color: MUTED }}>Sin horarios disponibles</p>
                    <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Prueba otro día</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button key={slot} onClick={() => { setSelectedTime(slot); setStep("form"); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                        className="py-3 rounded-xl text-sm font-semibold transition-all"
                        style={selectedTime === slot
                          ? { background: brand, color: "#fff" }
                          : { background: CARD, color: TEXT, border: `1px solid ${BORDER}` }}>
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
          <StepHeader brand={brand} onBack={() => setStep("datetime")} label={selectedService.name} sub={`${selectedDate ? format(parseISO(selectedDate), "d MMM", { locale: es }) : ""} · ${selectedTime}`} color={selectedService.color} bg={BG} border={BORDER} muted={MUTED} text={TEXT} subtle={SUBTLE} />
          <div className="px-5 pb-10 pt-3 space-y-5">
            {/* Summary */}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedService.color }} />
                <span className="font-bold text-sm" style={{ color: TEXT }}>{selectedService.name}</span>
                <span className="ml-auto font-bold text-sm" style={{ color: brand }}>${Number(selectedService.price).toLocaleString("es-CL")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                <Clock className="w-3.5 h-3.5" /> {selectedService.duration} min
                {selectedStaff && <><span>·</span><User className="w-3.5 h-3.5" /> {selectedStaff.user.name}</>}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate && format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime}
              </div>
            </div>

            {/* Payment */}
            {business.onlinePaymentsEnabled && Number(selectedService.price) > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>Forma de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "local" as PayMethod, label: "En el local", sub: "Efectivo o tarjeta" },
                    { value: "online" as PayMethod, label: "Pagar ahora", sub: `$${Number(selectedService.price).toLocaleString("es-CL")}` },
                  ]).map(opt => (
                    <button key={opt.value} onClick={() => setPayMethod(opt.value)}
                      className="p-3.5 rounded-xl text-left transition-all"
                      style={payMethod === opt.value
                        ? { background: brand + "12", border: `1.5px solid ${brand}` }
                        : { background: SUBTLE, border: `1.5px solid ${BORDER}` }}>
                      <p className="text-sm font-semibold" style={{ color: payMethod === opt.value ? brand : TEXT }}>{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: MUTED }}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fields */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>Tus datos</label>
              {[
                { key: "name", label: "Nombre completo", type: "text", placeholder: "María González" },
                { key: "email", label: "Email", type: "email", placeholder: "tu@email.com" },
                { key: "phone", label: "Teléfono (opcional)", type: "tel", placeholder: "+56 9 1234 5678" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: MUTED }}>{label}</label>
                  <input type={type} value={(form as Record<string, string>)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
                </div>
              ))}
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3} placeholder="Comentario para el profesional (opcional)"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
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
          <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-sm" style={{ background: "#dcfce7", border: "1px solid #bbf7d0" }}>
            <Check className="w-10 h-10" style={{ color: "#16a34a" }} />
          </div>
          <div>
            <h2 className="text-2xl font-black" style={{ color: TEXT }}>¡Reserva confirmada!</h2>
            <p className="text-sm mt-2" style={{ color: MUTED }}>Enviamos la confirmación a {form.email}</p>
          </div>
          <div className="w-full rounded-2xl p-5 space-y-3 text-left" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedService?.color }} />
              <span className="font-bold text-sm" style={{ color: TEXT }}>{selectedService?.name}</span>
            </div>
            {selectedStaff && (
              <div className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
                <User className="w-4 h-4" /> {selectedStaff.user.name}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
              <Calendar className="w-4 h-4" />
              {selectedDate && format(parseISO(selectedDate), "EEEE d 'de' MMMM yyyy", { locale: es })} · {selectedTime}
            </div>
            {(business.address || business.city) && (
              <div className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
                <MapPin className="w-4 h-4" />
                {[business.address, business.city].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={downloadIcs}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: SUBTLE, color: MUTED, border: `1px solid ${BORDER}` }}>
              <Download className="w-4 h-4" /> Calendario
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Reservé ${selectedService?.name} en ${business.name} — ${selectedDate ? format(parseISO(selectedDate), "d MMM", { locale: es }) : ""} ${selectedTime} 🗓️`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: SUBTLE, color: MUTED, border: `1px solid ${BORDER}` }}>
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

function ServiceCard({ service, brand, onSelect, card, border, muted, text, subtle }: {
  service: Service; brand: string; onSelect: () => void
  card: string; border: string; muted: string; text: string; subtle: string
}) {
  const [expanded, setExpanded] = useState(false)
  const hasDesc = !!service.description
  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{ background: card, border: `1px solid ${border}` }}>
      <button className="w-full flex items-center gap-4 p-4 text-left" onClick={() => hasDesc ? setExpanded(e => !e) : onSelect()}>
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight" style={{ color: text }}>{service.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: muted }}><Clock className="w-3 h-3 inline mr-1" />{service.duration} min</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-sm" style={{ color: brand }}>${Number(service.price).toLocaleString("es-CL")}</span>
          {hasDesc && (
            <ChevronDown className="w-4 h-4 transition-transform" style={{ color: muted, transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }} />
          )}
        </div>
      </button>
      {expanded && hasDesc && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${border}` }}>
          <p className="text-xs pt-3" style={{ color: muted }}>{service.description}</p>
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

function StepHeader({ brand, onBack, label, sub, color, bg, border, muted, text, subtle }: {
  brand: string; onBack: () => void; label: string; sub: string; color: string
  bg: string; border: string; muted: string; text: string; subtle: string
}) {
  return (
    <div className="sticky top-0 z-20 px-5 py-3.5 flex items-center gap-3" style={{ background: bg + "f0", backdropFilter: "blur(12px)", borderBottom: `1px solid ${border}` }}>
      <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all" style={{ background: subtle, border: `1px solid ${border}`, color: muted }}>
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: text }}>{label}</p>
          <p className="text-xs truncate" style={{ color: muted }}>{sub}</p>
        </div>
      </div>
    </div>
  )
}
