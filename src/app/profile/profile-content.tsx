"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import {
  User, Camera, Calendar, Trophy, LogOut, Clock,
  Loader2, Medal, Star, Zap, Gift, X, AlertCircle, CreditCard, ArrowLeft,
  Building2, Award, List, ChevronRight, MapPin, Plus,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { parseISO } from "date-fns"

type BusinessBenefit = {
  businessId: string; businessName: string; businessSlug: string
  businessCover: string | null; businessColor: string
  loyaltyEnabled: boolean
  loyaltyPoints: number; creditBalance: number; segment: string
  segmentDiscount: number; pointsPerVisit: number; vipThreshold: number; ptsToNext: number
  allowTransfer: boolean
}

type ProfileData = {
  user: { id: string; name: string | null; email: string | null; image: string | null; phone: string | null; rut: string | null }
  loyaltyPoints: number
  creditBalance: number
  businessBenefits: BusinessBenefit[]
  totalCompleted: number
  topService: { name: string; color: string; count: number } | null
  topStaff: { name: string; count: number } | null
  activeMemberships: {
    id: string; startDate: string; endDate: string; status: string
    plan: { name: string; description: string | null }
    business: { name: string }
  }[]
  upcomingAppointments: {
    id: string; startTime: string; endTime: string; status: string
    service: { name: string; color: string; duration: number; price: number | null }
    staff: { user: { name: string | null } } | null
    business: { name: string; slug: string; cancellationHoursNotice: number | null }
  }[]
  upcomingCourtBookings: {
    id: string; startTime: string; endTime: string; price: number; status: string; paidOnline: boolean
    paidAmount: number; transferVoucher: string | null
    recurringGroupId: string | null
    recurringGroup: {
      dayOfWeek: number; startHour: number; startMinute: number; durationMinutes: number
      rangeStart: string; rangeEnd: string
    } | null
    court: { name: string; sport: string | null; color: string }
    business: { name: string; slug: string; cancellationHoursNotice: number | null }
  }[]
  courtBookings: {
    id: string; startTime: string; endTime: string; price: number; status: string; paidOnline: boolean
    court: { name: string; sport: string | null; color: string }
    business: { name: string; slug: string }
  }[]
  appointments: {
    id: string; startTime: string; endTime: string; status: string
    service: { name: string; color: string; duration: number; price: number | null }
    staff: { user: { name: string | null } } | null
    business: { name: string; slug: string }
  }[]
  tournaments: {
    participantId: string; participantName: string; status: string
    seed: number | null; ladderPosition: number | null; group: string | null; category: string | null
    tournament: { id: string; name: string; status: string; startDate: string | null; endDate: string | null; sport: string | null; business: { name: string } }
  }[]
  recentMatches: {
    id: string; round: number; status: string
    myScore: string | null; opponentScore: string | null; opponent: string
    result: "W" | "L" | "P"
    tournamentName: string
  }[]
  availableTournaments: {
    id: string; name: string; sport: string | null; format: string; participantType: string
    startDate: string; endDate: string; maxParticipants: number | null; entryFee: number | null
    status: string; description: string | null; slug: string | null
    registrationDeadline: string | null
    business: { name: string; slug: string }
    categories: { id: string; name: string }[]
    participantCount: number
  }[]
}

// ── Design tokens ──────────────────────────────────────────────────────────
const SB       = "#0d1b2a"                    // sidebar navy
const SB_BD    = "rgba(56,189,248,0.1)"
const ACCENT   = "#38bdf8"                    // sky blue
const GOLD     = "#c9922b"
const GOLD_BD  = "rgba(201,146,43,0.4)"
const GOLD_BG  = "rgba(201,146,43,0.08)"
const PAGE_BG  = "#f0f4f8"                    // light page background
const WHITE    = "#ffffff"
const NAVY_C   = "#0f2a3f"                    // dark navy card
const TXT      = "#0f172a"                    // dark text
const MUTED    = "#64748b"
const BD       = "#e2e8f0"                    // light border
const LTXT     = "#f0f6ff"                    // light text on dark
const LMUTED   = "rgba(240,246,255,0.5)"

type Tab = "upcoming" | "competitions" | "matches" | "history" | "clubs" | "loyalty"

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { id: "upcoming",     label: "Reservas",       icon: Calendar  },
  { id: "competitions", label: "Competiciones",  icon: Medal     },
  { id: "matches",      label: "Partidos",       icon: Trophy    },
  { id: "history",      label: "Historial",      icon: Clock     },
  { id: "clubs",        label: "Mis clubs",      icon: Building2 },
  { id: "loyalty",      label: "Fidelización",   icon: Star      },
]

function statusLabel(s: string) {
  const map: Record<string, string> = {
    CONFIRMED: "Confirmada", PENDING: "Pendiente", CANCELLED: "Cancelada",
    COMPLETED: "Completada", NO_SHOW: "No asistió",
  }
  return map[s] ?? s
}
function statusColor(s: string) {
  if (s === "CONFIRMED") return "#16a34a"
  if (s === "COMPLETED") return "#0284c7"
  if (s === "CANCELLED" || s === "NO_SHOW") return "#dc2626"
  return MUTED
}

function dateLabel(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Hoy"
  if (isTomorrow(d)) return "Mañana"
  const days = differenceInDays(d, new Date())
  if (days > 0 && days <= 6) return `En ${days} días`
  return format(d, "d MMM", { locale: es })
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
      {children}
    </h2>
  )
}

type PendingBooking = {
  slug: string; businessName: string
  courtId: string; courtName: string; courtColor: string; sport: string | null
  slot: { time: string; price: number; paymentPlayers: number }
  date: string; duration: number
  form: { name: string; email: string; phone: string; notes: string }
  rut?: string; courtPayMethod: "local" | "online"; price: number
}

export default function ProfileContent() {
  const router = useRouter()
  const [data, setData]           = useState<ProfileData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<Tab>("upcoming")
  const [pendingBooking, setPendingBooking]       = useState<PendingBooking | null>(null)
  const [pendingConfirming, setPendingConfirming] = useState(false)
  const [pendingError, setPendingError]           = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [cancellingId, setCancellingId]     = useState<string | null>(null)
  const [cancelError, setCancelError]       = useState<string | null>(null)
  const [cancelledIds, setCancelledIds]     = useState<Set<string>>(new Set())
  const [confirmCancel, setConfirmCancel]   = useState<{
    type: "court" | "appt"; id: string; paidAmount: number; paidOnline: boolean; hasVoucher: boolean; name: string
  } | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState<{ message: string } | null>(null)
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [pendingTransfer, setPendingTransfer] = useState<{
    bookingId: string; businessId: string; businessSlug: string; businessName: string
    courtName: string; date: string; time: string; price: number
  } | null>(null)
  const [voucherUploading, setVoucherUploading] = useState(false)
  const [voucherUploaded, setVoucherUploaded] = useState(false)
  // Per-booking inline voucher upload state
  const [inlineVoucherUploading, setInlineVoucherUploading] = useState<string | null>(null)
  const [inlineVoucherUrls, setInlineVoucherUrls] = useState<Record<string, string>>({})
  const [cancelRecurringModal, setCancelRecurringModal] = useState<{ recurringGroupId: string; courtName: string } | null>(null)
  const [cancellingRecurring, setCancellingRecurring] = useState(false)

  async function uploadInlineVoucher(bookingId: string, businessId: string, file: File) {
    setInlineVoucherUploading(bookingId)
    const fd = new FormData()
    fd.append("file", file)
    const r = await fetch(`/api/businesses/${businessId}/court-bookings/${bookingId}/voucher`, { method: "POST", body: fd })
    setInlineVoucherUploading(null)
    if (r.ok) {
      const { url } = await r.json()
      setInlineVoucherUrls(prev => ({ ...prev, [bookingId]: url }))
      // Update local data to reflect uploaded voucher
      setData(d => d ? {
        ...d,
        upcomingCourtBookings: d.upcomingCourtBookings.map(b =>
          b.id === bookingId ? { ...b, transferVoucher: url } : b
        ),
      } : d)
    }
  }
  async function handleCancelRecurringSeries(recurringGroupId: string) {
    setCancellingRecurring(true)
    try {
      const r = await fetch("/api/profile/cancel-recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recurringGroupId, scope: "future" }),
      })
      if (r.ok) {
        setCancelRecurringModal(null)
        setCancelledIds(prev => {
          const next = new Set(prev)
          data?.upcomingCourtBookings.filter(b => b.recurringGroupId === recurringGroupId).forEach(b => next.add(b.id))
          return next
        })
        setTimeout(() => {
          fetch("/api/profile").then(res => res.ok ? res.json() : null).then(fresh => { if (fresh) setData(fresh) })
        }, 800)
      }
    } finally {
      setCancellingRecurring(false)
    }
  }

  const fileRef = useRef<HTMLInputElement>(null)

  function navigateToBooking(slug: string) {
    if (!data) return
    sessionStorage.setItem("booking_user_hint", JSON.stringify({
      name: data.user.name || "",
      email: data.user.email || "",
      phone: data.user.phone || "",
      rut: data.user.rut || "",
      businessSlug: slug,
    }))
    router.push(`/book/${slug}`)
  }

  function handleNewBooking(businesses: BusinessBenefit[]) {
    if (businesses.length === 1) {
      navigateToBooking(businesses[0].businessSlug)
    } else {
      setShowBookPicker(true)
    }
  }

  async function handleCancel(type: "court" | "appt", id: string, refundChoice: "refund" | "credit") {
    setCancellingId(id)
    setCancelError(null)
    const res = await fetch("/api/profile/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, refundChoice }),
    })
    const json = await res.json()
    if (!res.ok) {
      setCancelError(json.error ?? "Error al cancelar")
    } else {
      setCancelledIds(prev => new Set([...prev, id]))
      const amount = json.amount ?? 0
      if (json.refundResult === "refunded" && amount > 0) {
        setCancelSuccess({ message: `Reserva cancelada. Se reembolsarán $${amount.toLocaleString("es-CL")} a tu método de pago original.` })
      } else if (json.refundResult === "credited" && amount > 0) {
        setCancelSuccess({ message: `Reserva cancelada. Se abonaron $${amount.toLocaleString("es-CL")} a tu cuenta para una próxima reserva.` })
      } else {
        setCancelSuccess({ message: "Reserva cancelada exitosamente." })
      }
    }
    setCancellingId(null)
    setConfirmCancel(null)
  }

  function canCancel(startTime: string, hoursNotice: number | null): { allowed: boolean; reason?: string } {
    if (!hoursNotice || hoursNotice === 0) return { allowed: true }
    const hoursUntil = (new Date(startTime).getTime() - Date.now()) / 3_600_000
    if (hoursUntil < hoursNotice) {
      return { allowed: false, reason: `Cancelación hasta ${hoursNotice}h antes` }
    }
    return { allowed: true }
  }

  useEffect(() => {
    // Remember-me check: if user chose not to persist session and this is a new browser session, sign out
    const remember = localStorage.getItem("agendamok_remember")
    const alive = sessionStorage.getItem("agendamok_alive")
    if (remember === "0" && !alive) {
      // New browser session without remember-me → sign out silently
      fetch("/api/auth/signout", { method: "POST" }).catch(() => {})
      router.push("/login?callbackUrl=/profile")
      setLoading(false)
      return
    }
    // Mark session as alive for this browser session
    sessionStorage.setItem("agendamok_alive", "1")

    fetch("/api/auth/session")
      .then(r => r.ok ? r.json() : null)
      .then(session => {
        if (!session?.user) { router.push("/login?callbackUrl=/profile"); return }
        return fetch("/api/profile")
          .then(async r => {
            if (!r.ok) {
              const txt = await r.text().catch(() => "")
              console.error("[profile] /api/profile failed", r.status, txt)
              return null
            }
            return r.json()
          })
          .then(d => { if (d) setData(d) })
      })
      .catch(() => router.push("/login?callbackUrl=/profile"))
      .finally(() => setLoading(false))
  }, [router])

  // Detect pending booking from sessionStorage (coming from booking page after login)
  useEffect(() => {
    const saved = sessionStorage.getItem("booking_pending")
    if (saved) {
      try { setPendingBooking(JSON.parse(saved)) } catch {}
    }
  }, [])

  // Detect just-confirmed booking (coming from booking page direct confirm → redirect)
  useEffect(() => {
    const saved = sessionStorage.getItem("booking_just_confirmed")
    if (!saved) return
    sessionStorage.removeItem("booking_just_confirmed")
    try {
      const b = JSON.parse(saved)
      const startISO = `${b.date}T${b.time}:00`
      const endDate = new Date(startISO)
      endDate.setMinutes(endDate.getMinutes() + (b.duration ?? 60))
      const optimisticBooking = {
        id: b.bookingId ?? `opt-${Date.now()}`,
        startTime: startISO,
        endTime: endDate.toISOString(),
        price: b.price ?? 0,
        paidAmount: 0,
        status: "CONFIRMED" as const,
        paidOnline: false,
        court: { name: b.courtName, sport: b.sport ?? null, color: b.courtColor ?? "#38bdf8" },
        business: { name: b.businessName, slug: b.businessSlug, cancellationHoursNotice: null },
      }
      setData(d => d ? { ...d, upcomingCourtBookings: [...d.upcomingCourtBookings, optimisticBooking] } : d)
      setCancelSuccess({ message: `¡Reserva confirmada! ${b.courtName} · ${format(parseISO(b.date), "d 'de' MMMM", { locale: es })} · ${b.time}` })
      if (b.allowTransfer && b.bookingId) {
        setPendingTransfer({
          bookingId: b.bookingId,
          businessId: b.businessId,
          businessSlug: b.businessSlug,
          businessName: b.businessName,
          courtName: b.courtName,
          date: b.date,
          time: b.time,
          price: b.price ?? 0,
        })
      }
      // Background sync after short delay — merge to keep any optimistic bookings
      setTimeout(() => {
        fetch("/api/profile").then(r => r.ok ? r.json() : null).then(fresh => {
          if (fresh) setData(prev => {
            if (!prev) return fresh
            const serverIds = new Set(fresh.upcomingCourtBookings.map((b: { id: string }) => b.id))
            const optimistic = prev.upcomingCourtBookings.filter(b => !serverIds.has(b.id))
            return { ...fresh, upcomingCourtBookings: [...fresh.upcomingCourtBookings, ...optimistic] }
          })
        })
      }, 2000)
    } catch {}
  }, [])

  async function confirmPendingBooking() {
    if (!pendingBooking || !data) return
    setPendingConfirming(true)
    setPendingError(null)
    try {
      const res = await fetch(`/api/book/${pendingBooking.slug}/courts/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: pendingBooking.courtId,
          date: pendingBooking.date,
          time: pendingBooking.slot.time,
          duration: pendingBooking.duration,
          clientName: data.user.name || pendingBooking.form.name,
          clientEmail: data.user.email || pendingBooking.form.email,
          clientPhone: data.user.phone || pendingBooking.form.phone || undefined,
          notes: pendingBooking.form.notes || undefined,
          price: pendingBooking.slot.price,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setPendingError(json.error || "Error al confirmar"); setPendingConfirming(false); return }

      // Online payment redirect
      if (pendingBooking.courtPayMethod === "online" && pendingBooking.price > 0) {
        const payRes = await fetch(`/api/book/${pendingBooking.slug}/courts/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId: pendingBooking.courtId,
            date: pendingBooking.date,
            time: pendingBooking.slot.time,
            duration: pendingBooking.duration,
            clientName: data.user.name || pendingBooking.form.name,
            clientEmail: data.user.email || pendingBooking.form.email,
            price: pendingBooking.slot.price,
            paymentPlayers: pendingBooking.slot.paymentPlayers,
          }),
        })
        if (payRes.ok) {
          const payData = await payRes.json()
          if (payData.url) { sessionStorage.removeItem("booking_pending"); window.location.href = payData.url; return }
        }
      }

      sessionStorage.removeItem("booking_pending")
      setPendingBooking(null)
      setCancelSuccess({ message: `¡Reserva confirmada! ${pendingBooking.courtName} · ${format(parseISO(pendingBooking.date), "d 'de' MMMM", { locale: es })} · ${pendingBooking.slot.time}` })

      // Optimistically add booking to the upcoming list so it shows immediately
      const startISO = `${pendingBooking.date}T${pendingBooking.slot.time}:00`
      const endDate = new Date(startISO)
      endDate.setMinutes(endDate.getMinutes() + pendingBooking.duration)
      const optimisticBooking = {
        id: json.booking?.id ?? `opt-${Date.now()}`,
        startTime: startISO,
        endTime: endDate.toISOString(),
        price: pendingBooking.price,
        paidAmount: 0,
        status: "CONFIRMED" as const,
        paidOnline: false,
        court: { name: pendingBooking.courtName, sport: pendingBooking.sport, color: pendingBooking.courtColor },
        business: { name: pendingBooking.businessName, slug: pendingBooking.slug, cancellationHoursNotice: null },
      }
      setData(d => d ? { ...d, upcomingCourtBookings: [...d.upcomingCourtBookings, optimisticBooking] } : d)

      // Also show transfer banner if client has transfer enabled
      if (json.allowTransfer && json.booking?.id) {
        const biz = data.businessBenefits.find(b => b.businessSlug === pendingBooking.slug)
        setPendingTransfer({
          bookingId: json.booking.id,
          businessId: biz?.businessId ?? json.booking.businessId,
          businessSlug: pendingBooking.slug,
          businessName: pendingBooking.businessName,
          courtName: pendingBooking.courtName,
          date: pendingBooking.date,
          time: pendingBooking.slot.time,
          price: pendingBooking.price,
        })
      }

      // Background refresh to sync server state — merge to keep any optimistic bookings
      setTimeout(() => {
        fetch("/api/profile").then(r => r.ok ? r.json() : null).then(fresh => {
          if (fresh) setData(prev => {
            if (!prev) return fresh
            const serverIds = new Set(fresh.upcomingCourtBookings.map((b: { id: string }) => b.id))
            const optimistic = prev.upcomingCourtBookings.filter(b => !serverIds.has(b.id))
            return { ...fresh, upcomingCourtBookings: [...fresh.upcomingCourtBookings, ...optimistic] }
          })
        })
      }, 2000)
    } catch { setPendingError("Error de conexión. Intenta de nuevo.") }
    setPendingConfirming(false)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !data) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const r = await fetch("/api/upload", { method: "POST", body: fd })
      const { url } = await r.json()
      await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: url }) })
      setData(d => d ? { ...d, user: { ...d.user, image: url } } : d)
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (loading) return (
    <div style={{ background: SB, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT }} />
    </div>
  )
  if (!data) return (
    <div style={{ background: SB, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: LMUTED, fontSize: 14 }}>Error al cargar perfil</p>
    </div>
  )

  const {
    user, businessBenefits, activeMemberships, creditBalance,
    upcomingAppointments, upcomingCourtBookings,
    courtBookings, appointments, tournaments, recentMatches, availableTournaments,
  } = data

  const wins   = recentMatches.filter(m => m.result === "W").length
  const losses = recentMatches.filter(m => m.result === "L").length

  // Group recurring court bookings: one card per recurring series
  const recurringMap = new Map<string, typeof upcomingCourtBookings>()
  const nonRecurringCourt: typeof upcomingCourtBookings = []
  for (const b of upcomingCourtBookings) {
    if (b.recurringGroupId) {
      const arr = recurringMap.get(b.recurringGroupId) ?? []
      arr.push(b)
      recurringMap.set(b.recurringGroupId, arr)
    } else {
      nonRecurringCourt.push(b)
    }
  }
  const recurringCards = Array.from(recurringMap.values()).map(bookings => ({
    ...bookings[0], _isRecurringCard: true as const,
  }))

  const allUpcoming = [
    ...upcomingAppointments.map(a => ({ ...a, type: "appt" as const, date: a.startTime, _isRecurringCard: false as const })),
    ...nonRecurringCourt.map(b => ({ ...b, type: "court" as const, date: b.startTime, _isRecurringCard: false as const })),
    ...recurringCards.map(b => ({ ...b, type: "court" as const, date: b.startTime })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const allHistory = [
    ...courtBookings.map(b => ({ ...b, type: "court" as const, date: b.startTime })),
    ...appointments.map(a => ({ ...a, type: "appt" as const, date: a.startTime })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ── Avatar section (reused in both sidebar and mobile header)
  const AvatarBlock = ({ size = 48 }: { size?: number }) => (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${ACCENT}`, overflow: "hidden",
        background: "rgba(56,189,248,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {user.image
          ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <User style={{ width: size * 0.44, height: size * 0.44, color: ACCENT }} />}
      </div>
      <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto}
        style={{
          position: "absolute", bottom: -2, right: -2,
          width: 20, height: 20, borderRadius: "50%",
          background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center",
          border: `2px solid ${SB}`, cursor: "pointer",
        }}>
        {uploadingPhoto
          ? <Loader2 style={{ width: 9, height: 9, color: "#000" }} className="animate-spin" />
          : <Camera style={{ width: 9, height: 9, color: "#000" }} />}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
    </div>
  )

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: PAGE_BG }}>

      {/* ─── SIDEBAR (desktop only) ────────────────────────────────────────── */}
      <aside style={{
        width: 240, background: SB, flexDirection: "column",
        flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }} className="hidden lg:flex">

        {/* Logo */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${SB_BD}` }}>
          <span style={{ color: LTXT, fontSize: 13, fontWeight: 900, letterSpacing: "0.05em" }}>
            Agenda<span style={{ color: ACCENT }}>Mok</span>
          </span>
          <p style={{ color: LMUTED, fontSize: 10, marginTop: 2, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Mi perfil
          </p>
        </div>

        {/* Avatar + user info */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${SB_BD}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AvatarBlock size={44} />
            <div style={{ minWidth: 0 }}>
              <p style={{ color: LTXT, fontSize: 13, fontWeight: 700, lineHeight: 1.2 }} className="truncate">
                {user.name ?? "Sin nombre"}
              </p>
              <p style={{ color: LMUTED, fontSize: 11, marginTop: 2 }} className="truncate">
                {user.email}
              </p>
              {user.rut && (
                <span style={{
                  display: "inline-block", marginTop: 5, fontSize: 10,
                  fontFamily: "monospace", fontWeight: 700,
                  padding: "1px 8px", borderRadius: 100,
                  background: "rgba(56,189,248,0.12)", color: ACCENT,
                }}>
                  {user.rut}
                </span>
              )}
            </div>
          </div>
          {creditBalance > 0 && (
            <div style={{
              marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)",
              borderRadius: 10, padding: "8px 12px",
            }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Saldo a favor</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>
                ${creditBalance.toLocaleString("es-CL")}
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                  background: active ? "rgba(56,189,248,0.12)" : "transparent",
                  color: active ? ACCENT : LMUTED,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  border: active ? "1px solid rgba(56,189,248,0.2)" : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                }}>
                <t.icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* Nueva reserva button */}
        <div style={{ padding: "0 12px 16px" }}>
          <button
            onClick={() => handleNewBooking(businessBenefits)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "11px 16px", borderRadius: 10,
              background: ACCENT, color: "#0d1b2a",
              fontSize: 13, fontWeight: 800, cursor: "pointer", border: "none",
              boxShadow: "0 2px 12px rgba(56,189,248,0.3)",
            }}>
            <Plus style={{ width: 15, height: 15 }} />
            Nueva reserva
          </button>
        </div>

        {/* Logout */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${SB_BD}` }}>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ display: "flex", alignItems: "center", gap: 8, color: LMUTED, fontSize: 12, cursor: "pointer", background: "transparent", border: "none" }}>
            <LogOut style={{ width: 14, height: 14 }} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Mobile header (hidden on desktop) */}
        <div style={{ background: SB }} className="lg:hidden">
          <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: LTXT, fontSize: 13, fontWeight: 900, letterSpacing: "0.05em" }}>
              Agenda<span style={{ color: ACCENT }}>Mok</span>
            </span>
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              style={{ display: "flex", alignItems: "center", gap: 5, color: LMUTED, fontSize: 12, background: "transparent", border: "none", cursor: "pointer" }}>
              <LogOut style={{ width: 13, height: 13 }} />Salir
            </button>
          </div>

          <div style={{ padding: "14px 16px 16px", display: "flex", alignItems: "center", gap: 14 }}>
            <AvatarBlock size={58} />
            <div style={{ minWidth: 0 }}>
              <p style={{ color: LTXT, fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{user.name ?? "Sin nombre"}</p>
              <p style={{ color: LMUTED, fontSize: 12, marginTop: 3 }}>{user.email}</p>
              {user.phone && <p style={{ color: LMUTED, fontSize: 11 }}>{user.phone}</p>}
              {user.rut && (
                <span style={{
                  display: "inline-block", marginTop: 5, fontSize: 10, fontFamily: "monospace",
                  fontWeight: 700, padding: "2px 8px", borderRadius: 100,
                  background: "rgba(56,189,248,0.12)", color: ACCENT,
                }}>
                  {user.rut}
                </span>
              )}
            </div>
            {/* Billetera — por negocio */}
            {data && data.businessBenefits.length > 0 && (
              <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                {data.businessBenefits.map(b => (
                  <div key={b.businessId} style={{ textAlign: "right" }}>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1 }}>
                      {b.businessName}
                    </p>
                    <p style={{ color: b.creditBalance > 0 ? "#4ade80" : "rgba(255,255,255,0.4)", fontWeight: 900, fontSize: 18, lineHeight: 1.1 }}>
                      ${b.creditBalance.toLocaleString("es-CL")}
                    </p>
                    <a href={`/wallet/${b.businessSlug}`}
                      style={{ fontSize: 10, color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
                      + Recargar
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile tab bar */}
          <div style={{
            display: "flex", overflowX: "auto", gap: 0,
            borderTop: `1px solid ${SB_BD}`,
            scrollbarWidth: "none",
          }}>
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    padding: "10px 16px", flexShrink: 0,
                    borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                    color: active ? ACCENT : LMUTED,
                    fontSize: 10, fontWeight: active ? 700 : 500,
                    background: "transparent", cursor: "pointer", border: "none",
                    borderBottomStyle: "solid",
                    borderBottomWidth: 2,
                    borderBottomColor: active ? ACCENT : "transparent",
                    transition: "all 0.15s", whiteSpace: "nowrap",
                  }}>
                  <t.icon style={{ width: 16, height: 16 }} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Pending booking banner ─────────────────────────────────────── */}
        {pendingBooking && (
          <div style={{
            margin: "16px 20px 0",
            borderRadius: 16, overflow: "hidden",
            border: `1px solid ${GOLD_BD}`,
            maxWidth: 720,
          }}>
            {/* Header */}
            <div style={{
              background: NAVY_C, padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: pendingBooking.courtColor, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: LTXT, lineHeight: 1.2 }}>Reserva pendiente de confirmar</p>
                  <p style={{ fontSize: 11, color: LMUTED, marginTop: 2 }}>{pendingBooking.businessName}</p>
                </div>
              </div>
              <button onClick={() => { setPendingBooking(null); sessionStorage.removeItem("booking_pending") }}
                style={{ background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, color: LMUTED }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Details */}
            <div style={{ background: WHITE, padding: "14px 16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: TXT, marginBottom: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                  🎾 {pendingBooking.courtName}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar style={{ width: 13, height: 13, color: MUTED }} />
                  {format(parseISO(pendingBooking.date), "EEEE d 'de' MMMM", { locale: es })}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock style={{ width: 13, height: 13, color: MUTED }} />
                  {pendingBooking.slot.time} · {pendingBooking.duration} min
                </span>
                {pendingBooking.price > 0 && (
                  <span style={{ fontWeight: 800, color: GOLD }}>
                    ${pendingBooking.price.toLocaleString("es-CL")}
                  </span>
                )}
              </div>

              {pendingError && (
                <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  <AlertCircle style={{ width: 13, height: 13 }} />{pendingError}
                </p>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={confirmPendingBooking} disabled={pendingConfirming}
                  style={{
                    flex: 1, padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 800,
                    background: SB, color: ACCENT, border: `1px solid rgba(56,189,248,0.3)`,
                    cursor: pendingConfirming ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    opacity: pendingConfirming ? 0.7 : 1,
                  }}>
                  {pendingConfirming
                    ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Confirmando...</>
                    : pendingBooking.courtPayMethod === "online" && pendingBooking.price > 0
                      ? `Pagar $${pendingBooking.price.toLocaleString("es-CL")} →`
                      : "Confirmar reserva →"}
                </button>
                <button onClick={() => { setPendingBooking(null); sessionStorage.removeItem("booking_pending") }}
                  style={{
                    padding: "11px 16px", borderRadius: 10, fontSize: 12,
                    background: "transparent", color: MUTED, border: `1px solid ${BD}`,
                    cursor: "pointer",
                  }}>
                  Descartar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Transfer upload banner ────────────────────────────────────────── */}
        {pendingTransfer && (
          <div style={{
            margin: "12px 20px 0",
            borderRadius: 16, overflow: "hidden",
            border: "1px solid rgba(56,189,248,0.3)",
            maxWidth: 720,
          }}>
            <div style={{ background: NAVY_C, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: LTXT }}>🏦 Adjunta tu comprobante de transferencia</p>
                <p style={{ fontSize: 11, color: LMUTED, marginTop: 2 }}>
                  {pendingTransfer.courtName} · {format(parseISO(pendingTransfer.date), "d 'de' MMMM", { locale: es })} · {pendingTransfer.time}
                  {pendingTransfer.price > 0 && <> · <span style={{ color: GOLD, fontWeight: 700 }}>${pendingTransfer.price.toLocaleString("es-CL")}</span></>}
                </p>
              </div>
              <button onClick={() => setPendingTransfer(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: LMUTED, flexShrink: 0 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ background: WHITE, padding: "14px 16px" }}>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
                El club validará el pago una vez recibido el comprobante.
              </p>
              {voucherUploaded ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>Comprobante enviado</span>
                </div>
              ) : (
                <label style={{ display: "block", cursor: voucherUploading ? "wait" : "pointer" }}>
                  <input type="file" accept="image/*" className="hidden" disabled={voucherUploading}
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setVoucherUploading(true)
                      const fd = new FormData()
                      fd.append("file", file)
                      const r = await fetch(
                        `/api/businesses/${pendingTransfer.businessId}/court-bookings/${pendingTransfer.bookingId}/voucher`,
                        { method: "POST", body: fd }
                      )
                      setVoucherUploading(false)
                      if (r.ok) setVoucherUploaded(true)
                    }} />
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: SB, color: ACCENT,
                    border: "1px solid rgba(56,189,248,0.25)",
                    opacity: voucherUploading ? 0.6 : 1,
                  }}>
                    {voucherUploading
                      ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Subiendo...</>
                      : <>📎 Subir comprobante</>}
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Page body */}
        <div style={{ padding: "24px 20px", maxWidth: 720, width: "100%" }}>

          {/* ── TAB: Próximas reservas ─────────────────────────────────────── */}
          {tab === "upcoming" && (
            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>
                  Próximas reservas
                </h2>
                <button
                  onClick={() => handleNewBooking(businessBenefits)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 8,
                    background: SB, color: ACCENT,
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    border: `1px solid rgba(56,189,248,0.25)`,
                  }}>
                  <Plus style={{ width: 12, height: 12 }} />
                  Nueva reserva
                </button>
              </div>

              {cancelError && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 10, marginBottom: 10,
                  background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)",
                  color: "#dc2626", fontSize: 12,
                }}>
                  <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                  {cancelError}
                  <button onClick={() => setCancelError(null)} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer" }}>
                    <X style={{ width: 14, height: 14, color: "#dc2626" }} />
                  </button>
                </div>
              )}

              {allUpcoming.length === 0 ? (
                <div style={{
                  background: WHITE, border: `1px solid ${BD}`, borderRadius: 16,
                  padding: "40px 24px", textAlign: "center",
                }}>
                  <Calendar style={{ width: 32, height: 32, color: BD, margin: "0 auto 10px" }} />
                  <p style={{ color: MUTED, fontSize: 13 }}>Sin próximas reservas</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {allUpcoming.filter(b => !cancelledIds.has(b.id)).map(b => {
                    const accentColor = b.type === "court" ? b.court.color : b.service.color
                    const name = b.type === "court" ? b.court.name : b.service.name

                    // ── Recurring card ──────────────────────────────────────────
                    if (b._isRecurringCard && b.type === "court" && b.recurringGroup) {
                      const rg = b.recurringGroup
                      const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
                      const dayName = DAY_NAMES[rg.dayOfWeek]
                      const sh = String(rg.startHour).padStart(2, "0")
                      const sm = String(rg.startMinute).padStart(2, "0")
                      const endMin = rg.startHour * 60 + rg.startMinute + rg.durationMinutes
                      const eh = String(Math.floor(endMin / 60)).padStart(2, "0")
                      const em = String(endMin % 60).padStart(2, "0")
                      const nextLabel = dateLabel(b.startTime)
                      const nextIsToday = nextLabel === "Hoy"
                      const nextIsTomorrow = nextLabel === "Mañana"
                      const nextBadgeBg = nextIsToday ? "rgba(34,197,94,0.15)" : nextIsTomorrow ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.07)"
                      const nextBadgeColor = nextIsToday ? "#4ade80" : nextIsTomorrow ? "#fbbf24" : "rgba(255,255,255,0.45)"
                      const nextBadgeBorder = nextIsToday ? "rgba(34,197,94,0.3)" : nextIsTomorrow ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.1)"
                      const rangeStart = format(new Date(rg.rangeStart), "d MMM yyyy", { locale: es })
                      const rangeEnd = format(new Date(rg.rangeEnd), "d MMM yyyy", { locale: es })
                      return (
                        <div key={`rec-${b.recurringGroupId}`} style={{
                          borderRadius: 16, overflow: "hidden",
                          background: "linear-gradient(135deg, #131f2e 0%, #0f1a28 100%)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                        }}>
                          <div style={{ height: 3, background: accentColor, opacity: 0.85 }} />
                          <div style={{ padding: "14px 16px 14px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <p style={{ color: "#fff", fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>{name}</p>
                                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 100, background: "rgba(56,189,248,0.12)", color: ACCENT, border: "1px solid rgba(56,189,248,0.2)", letterSpacing: "0.05em" }}>↺ RECURRENTE</span>
                                </div>
                                <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 3 }}>{b.business.name}</p>
                              </div>
                              <span style={{
                                flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                                background: nextBadgeBg, color: nextBadgeColor, border: `1px solid ${nextBadgeBorder}`, letterSpacing: "0.01em",
                              }}>{nextLabel}</span>
                            </div>
                            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                                <span style={{ fontSize: 13 }}>↺</span>
                                <span style={{ fontWeight: 600 }}>Todos los {dayName}s</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                                <Clock style={{ width: 12, height: 12 }} />
                                <span style={{ fontWeight: 600 }}>{sh}:{sm} – {eh}:{em} hrs</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                                <Calendar style={{ width: 11, height: 11 }} />
                                <span>{rangeStart} → {rangeEnd}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                              {Number(b.price) > 0 && (
                                <span style={{ fontSize: 14, fontWeight: 800, color: accentColor }}>
                                  ${Number(b.price).toLocaleString("es-CL")}/sesión
                                </span>
                              )}
                              <div style={{ marginLeft: "auto" }}>
                                <button
                                  onClick={() => setCancelRecurringModal({ recurringGroupId: b.recurringGroupId!, courtName: name })}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 4,
                                    fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 7,
                                    background: "transparent", color: "rgba(248,113,113,0.7)",
                                    border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer",
                                  }}>
                                  <X style={{ width: 11, height: 11 }} />
                                  Cancelar serie
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // ── Individual card ─────────────────────────────────────────
                    const hoursNotice = b.business.cancellationHoursNotice ?? null
                    const { allowed, reason } = canCancel(b.startTime, hoursNotice)
                    const isCancelling = cancellingId === b.id
                    const label = dateLabel(b.startTime)
                    const isToday = label === "Hoy"
                    const isTomorrow = label === "Mañana"
                    const badgeBg = isToday ? "rgba(34,197,94,0.15)" : isTomorrow ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.07)"
                    const badgeColor = isToday ? "#4ade80" : isTomorrow ? "#fbbf24" : "rgba(255,255,255,0.45)"
                    const badgeBorder = isToday ? "rgba(34,197,94,0.3)" : isTomorrow ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.1)"
                    const endTime = format(new Date(b.endTime), "HH:mm")

                    return (
                      <div key={b.id} style={{
                        borderRadius: 16, overflow: "hidden",
                        background: "linear-gradient(135deg, #131f2e 0%, #0f1a28 100%)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                      }}>
                        {/* Colored top strip */}
                        <div style={{ height: 3, background: accentColor, opacity: 0.85 }} />

                        <div style={{ padding: "14px 16px 0" }}>
                          {/* Header: name + date badge */}
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ color: "#fff", fontSize: 15, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.01em" }} className="truncate">
                                {name}
                              </p>
                              <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 3 }}>
                                {b.business.name}
                                {b.type === "appt" && b.staff?.user.name && ` · ${b.staff.user.name}`}
                              </p>
                            </div>
                            <span style={{
                              flexShrink: 0, fontSize: 11, fontWeight: 700,
                              padding: "3px 10px", borderRadius: 100,
                              background: badgeBg, color: badgeColor,
                              border: `1px solid ${badgeBorder}`,
                              letterSpacing: "0.01em",
                            }}>
                              {label}
                            </span>
                          </div>

                          {/* Time + Price */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                              <Clock style={{ width: 12, height: 12 }} />
                              <span style={{ fontWeight: 600 }}>
                                {format(new Date(b.startTime), "HH:mm")} – {endTime} hrs
                              </span>
                            </div>
                            {b.type === "court" && Number(b.price) > 0 && (
                              <span style={{ fontSize: 16, fontWeight: 900, color: accentColor, letterSpacing: "-0.02em" }}>
                                ${Number(b.price).toLocaleString("es-CL")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Transfer voucher section */}
                        {b.type === "court" && (() => {
                          const biz = businessBenefits.find(bz => bz.businessSlug === b.business.slug)
                          const canTransfer = biz?.allowTransfer ?? false
                          const price = Number(b.price)
                          const paid = Number(b.paidAmount ?? 0)
                          const isPaid = paid >= price && price > 0
                          const hasVoucher = !!(b.transferVoucher || inlineVoucherUrls[b.id])
                          const isUploading = inlineVoucherUploading === b.id
                          if (!canTransfer && !hasVoucher) return null
                          return (
                            <div style={{ margin: "12px 16px 0", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                              {isPaid ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#4ade80" }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  Pago confirmado
                                </div>
                              ) : hasVoucher ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#fbbf24", fontWeight: 600 }}>
                                  <Clock style={{ width: 11, height: 11 }} />
                                  Comprobante enviado · pendiente de confirmación
                                </div>
                              ) : (
                                <label style={{ cursor: isUploading ? "wait" : "pointer" }}>
                                  <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                                    onChange={e => {
                                      const file = e.target.files?.[0]
                                      if (file && biz) uploadInlineVoucher(b.id, biz.businessId, file)
                                    }} />
                                  <div style={{
                                    display: "inline-flex", alignItems: "center", gap: 6,
                                    fontSize: 11, fontWeight: 700,
                                    padding: "6px 12px", borderRadius: 8,
                                    background: "rgba(56,189,248,0.1)", color: ACCENT,
                                    border: "1px solid rgba(56,189,248,0.2)",
                                    opacity: isUploading ? 0.6 : 1,
                                  }}>
                                    {isUploading
                                      ? <><Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />Subiendo…</>
                                      : <>📎 Subir comprobante</>}
                                  </div>
                                </label>
                              )}
                            </div>
                          )
                        })()}

                        {/* Footer: cancel reason + button */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 14px", gap: 8, marginTop: 4 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {!allowed && reason && (
                              <p style={{ fontSize: 10, color: "rgba(248,113,113,0.6)", display: "flex", alignItems: "center", gap: 3 }}>
                                <AlertCircle style={{ width: 10, height: 10 }} />{reason}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (!allowed || isCancelling) return
                              const paidAmount = b.type === "court" ? (Number(b.paidAmount) ?? 0) : 0
                              const paidOnline = b.type === "court" ? (b.paidOnline ?? false) : false
                              const hasVoucher = b.type === "court" ? !!b.transferVoucher : false
                              setConfirmCancel({ type: b.type, id: b.id, paidAmount, paidOnline, hasVoucher, name })
                            }}
                            disabled={!allowed || isCancelling}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 7,
                              background: "transparent",
                              color: allowed ? "rgba(248,113,113,0.7)" : "rgba(255,255,255,0.15)",
                              border: `1px solid ${allowed ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.07)"}`,
                              cursor: allowed ? "pointer" : "not-allowed", flexShrink: 0,
                              transition: "all 0.15s",
                            }}>
                            {isCancelling
                              ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                              : <X style={{ width: 11, height: 11 }} />}
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Active memberships */}
              {activeMemberships.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <SectionHeading>Membresías activas</SectionHeading>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {activeMemberships.map(m => {
                      const daysLeft = differenceInDays(new Date(m.endDate), new Date())
                      const urgent = daysLeft <= 7
                      return (
                        <div key={m.id} style={{
                          background: WHITE, border: `1px solid ${urgent ? "rgba(245,158,11,0.4)" : BD}`,
                          borderRadius: 12, padding: "14px 16px",
                          display: "flex", alignItems: "center", gap: 12,
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: urgent ? "rgba(245,158,11,0.1)" : "rgba(56,189,248,0.08)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Award style={{ width: 16, height: 16, color: urgent ? "#f59e0b" : ACCENT }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: TXT }}>{m.plan.name}</p>
                            <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{m.business.name}</p>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, flexShrink: 0,
                            background: urgent ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
                            color: urgent ? "#d97706" : "#16a34a",
                          }}>
                            {urgent ? `Vence en ${daysLeft}d` : "Activa"}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── TAB: Competiciones ─────────────────────────────────────────── */}
          {tab === "competitions" && (() => {
            const sportEmoji: Record<string, string> = {
              PADEL: "🎾", TENNIS: "🎾", SOCCER: "⚽", BASKETBALL: "🏀",
              VOLLEYBALL: "🏐", BASEBALL: "⚾", FUTSAL: "⚽", SQUASH: "🏸",
            }
            const statusMap: Record<string, { label: string; bg: string; color: string }> = {
              IN_PROGRESS: { label: "En curso",               bg: "rgba(56,189,248,0.1)",  color: ACCENT },
              OPEN:        { label: "Inscripciones abiertas", bg: "rgba(56,189,248,0.08)", color: ACCENT },
              DRAFT:       { label: "Borrador",               bg: "rgba(100,116,139,0.1)", color: MUTED  },
              FINISHED:    { label: "Finalizado",              bg: "rgba(100,116,139,0.1)", color: MUTED  },
            }
            const ptLabel: Record<string, string> = {
              INDIVIDUAL: "Individual", PAIR: "Dobles", TEAM: "Equipos",
            }
            const fmtLabel: Record<string, string> = {
              ELIMINATION: "Eliminación directa", ROUND_ROBIN: "Round Robin",
              GROUPS_ELIMINATION: "Grupos + Eliminación", LADDER: "Escalerilla",
            }

            return (
              <section>
                {/* Mis inscripciones */}
                {tournaments.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <SectionHeading>Mis inscripciones</SectionHeading>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {tournaments.map(t => {
                        const st = statusMap[t.tournament.status] ?? statusMap.UPCOMING
                        const emoji = sportEmoji[(t.tournament.sport ?? "").toUpperCase()] ?? "🏆"
                        const myMatches = recentMatches.filter(m => m.tournamentName === t.tournament.name)
                        const myWins   = myMatches.filter(m => m.result === "W").length
                        const myLosses = myMatches.filter(m => m.result === "L").length

                        return (
                          <div key={t.participantId} style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 16, overflow: "hidden" }}>
                            <div style={{ background: SB, padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: 14, fontWeight: 800, color: LTXT, lineHeight: 1.2 }}>{t.tournament.name}</p>
                                  <p style={{ fontSize: 11, color: LMUTED, marginTop: 3 }}>{t.tournament.business.name}</p>
                                </div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, flexShrink: 0, background: st.bg, color: st.color }}>
                                {st.label}
                              </span>
                            </div>
                            <div style={{ padding: "14px 16px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "rgba(56,189,248,0.08)", color: ACCENT }}>
                                  {t.participantName}
                                </span>
                                {t.category && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "#f8fafc", color: MUTED, border: `1px solid ${BD}` }}>{t.category}</span>}
                                {t.group && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: "#f8fafc", color: MUTED, border: `1px solid ${BD}` }}>Grupo {t.group}</span>}
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))", gap: 8 }}>
                                {t.seed != null && (
                                  <div style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, background: GOLD_BG, border: `1px solid rgba(201,146,43,0.25)` }}>
                                    <p style={{ fontSize: 20, fontWeight: 900, color: GOLD, lineHeight: 1 }}>#{t.seed}</p>
                                    <p style={{ fontSize: 9, color: MUTED, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cabeza</p>
                                  </div>
                                )}
                                {t.ladderPosition != null && (
                                  <div style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)" }}>
                                    <p style={{ fontSize: 20, fontWeight: 900, color: ACCENT, lineHeight: 1 }}>#{t.ladderPosition}</p>
                                    <p style={{ fontSize: 9, color: MUTED, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Escalerilla</p>
                                  </div>
                                )}
                                {myMatches.length > 0 && <>
                                  <div style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)" }}>
                                    <p style={{ fontSize: 20, fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>{myWins}</p>
                                    <p style={{ fontSize: 9, color: MUTED, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Victorias</p>
                                  </div>
                                  <div style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)" }}>
                                    <p style={{ fontSize: 20, fontWeight: 900, color: "#dc2626", lineHeight: 1 }}>{myLosses}</p>
                                    <p style={{ fontSize: 9, color: MUTED, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Derrotas</p>
                                  </div>
                                </>}
                              </div>
                              {(t.tournament.startDate || t.tournament.endDate) && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, fontSize: 11, color: MUTED }}>
                                  {t.tournament.startDate && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar style={{ width: 11, height: 11 }} />Inicio: {format(new Date(t.tournament.startDate), "d MMM yyyy", { locale: es })}</span>}
                                  {t.tournament.endDate && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar style={{ width: 11, height: 11 }} />Fin: {format(new Date(t.tournament.endDate), "d MMM", { locale: es })}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Torneos disponibles para inscribirse */}
                <SectionHeading>Disponibles para inscribirse</SectionHeading>
                {availableTournaments.length === 0 ? (
                  <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
                    <Medal style={{ width: 32, height: 32, color: BD, margin: "0 auto 10px" }} />
                    <p style={{ color: MUTED, fontSize: 13 }}>No hay torneos con inscripciones abiertas</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {availableTournaments.map(t => {
                      const emoji = sportEmoji[(t.sport ?? "").toUpperCase()] ?? "🏆"
                      const spots = t.maxParticipants ? t.maxParticipants - t.participantCount : null
                      const deadlineSoon = t.registrationDeadline
                        ? differenceInDays(new Date(t.registrationDeadline), new Date()) <= 3
                        : false
                      const bookUrl = `/torneos/${t.id}`

                      return (
                        <div key={t.id} style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 14, overflow: "hidden" }}>
                          {/* Header */}
                          <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, borderBottom: `1px solid ${BD}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 800, color: TXT, lineHeight: 1.2 }} className="truncate">{t.name}</p>
                                <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{t.business.name}</p>
                              </div>
                            </div>
                            {spots !== null && spots <= 4 && spots > 0 && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, flexShrink: 0, background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
                                {spots} cupo{spots !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Body */}
                          <div style={{ padding: "12px 16px" }}>
                            {/* Tags */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "#f1f5f9", color: MUTED, border: `1px solid ${BD}` }}>
                                {fmtLabel[t.format] ?? t.format}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "#f1f5f9", color: MUTED, border: `1px solid ${BD}` }}>
                                {ptLabel[t.participantType] ?? t.participantType}
                              </span>
                              {t.categories.map(c => (
                                <span key={c.id} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "rgba(56,189,248,0.07)", color: ACCENT, border: "1px solid rgba(56,189,248,0.2)" }}>
                                  {c.name}
                                </span>
                              ))}
                            </div>

                            {/* Info row */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 11, color: MUTED, marginBottom: 12 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Calendar style={{ width: 11, height: 11 }} />
                                {format(new Date(t.startDate), "d MMM yyyy", { locale: es })}
                              </span>
                              {t.maxParticipants && (
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <User style={{ width: 11, height: 11 }} />
                                  {t.participantCount}/{t.maxParticipants}
                                </span>
                              )}
                              {t.entryFee != null && t.entryFee > 0 && (
                                <span style={{ fontWeight: 700, color: TXT }}>
                                  ${t.entryFee.toLocaleString("es-CL")}
                                </span>
                              )}
                              {t.entryFee === 0 && (
                                <span style={{ fontWeight: 700, color: "#16a34a" }}>Gratis</span>
                              )}
                              {t.registrationDeadline && (
                                <span style={{ display: "flex", alignItems: "center", gap: 4, color: deadlineSoon ? "#dc2626" : MUTED, fontWeight: deadlineSoon ? 700 : 400 }}>
                                  <Clock style={{ width: 11, height: 11 }} />
                                  Cierre: {format(new Date(t.registrationDeadline), "d MMM", { locale: es })}
                                </span>
                              )}
                            </div>

                            {/* CTA */}
                            <a href={bookUrl} style={{
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                              padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                              background: SB, color: ACCENT,
                              border: `1px solid rgba(56,189,248,0.25)`,
                              textDecoration: "none", width: "100%",
                            }}>
                              <Trophy style={{ width: 14, height: 14 }} />
                              Ver torneo e inscribirse
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })()}

          {/* ── TAB: Partidos ──────────────────────────────────────────────── */}
          {tab === "matches" && (
            <section>
              <SectionHeading>Mis partidos</SectionHeading>

              {/* Stats */}
              {recentMatches.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Jugados", value: recentMatches.length, color: TXT },
                    { label: "Victorias", value: wins, color: "#16a34a" },
                    { label: "Derrotas", value: losses, color: "#dc2626" },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: WHITE, border: `1px solid ${BD}`,
                      borderRadius: 12, padding: "14px 12px", textAlign: "center",
                    }}>
                      <p style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
                      <p style={{ fontSize: 10, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tournaments */}
              {tournaments.filter(t => t.tournament.status !== "FINISHED" && t.tournament.status !== "CANCELLED").length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Torneos activos</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tournaments.filter(t => t.tournament.status !== "FINISHED" && t.tournament.status !== "CANCELLED").map(t => (
                      <div key={t.participantId} style={{
                        background: WHITE, border: `1px solid ${BD}`,
                        borderRadius: 12, padding: "14px 16px",
                        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: TXT }}>{t.tournament.name}</p>
                          <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{t.tournament.business.name}</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, fontSize: 11, color: MUTED }}>
                            {t.category && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Trophy style={{ width: 10, height: 10 }} />{t.category}</span>}
                            {t.seed && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Medal style={{ width: 10, height: 10 }} />Cabeza #{t.seed}</span>}
                            {t.group && <span>Grupo {t.group}</span>}
                            {t.tournament.startDate && (
                              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <Calendar style={{ width: 10, height: 10 }} />
                                {format(new Date(t.tournament.startDate), "d MMM", { locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, flexShrink: 0,
                          background: "rgba(56,189,248,0.1)", color: ACCENT,
                        }}>
                          {t.tournament.status === "IN_PROGRESS" ? "En curso" : "Inscripciones abiertas"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent match results */}
              {recentMatches.length > 0 ? (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Últimos resultados</p>
                  <div style={{ background: WHITE, border: `1px solid ${BD}`, borderRadius: 12, overflow: "hidden" }}>
                    {recentMatches.slice(0, 8).map((m, i) => (
                      <div key={m.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                        borderBottom: i < recentMatches.slice(0, 8).length - 1 ? `1px solid ${BD}` : undefined,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 900,
                          background: m.result === "W" ? "rgba(22,163,74,0.12)" : m.result === "L" ? "rgba(220,38,38,0.1)" : "rgba(100,116,139,0.1)",
                          color: m.result === "W" ? "#16a34a" : m.result === "L" ? "#dc2626" : MUTED,
                        }}>
                          {m.result === "P" ? "–" : m.result}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TXT }} className="truncate">vs {m.opponent}</p>
                          <p style={{ fontSize: 11, color: MUTED, marginTop: 1 }} className="truncate">
                            Ronda {m.round} · {m.tournamentName}
                          </p>
                        </div>
                        {m.myScore && (
                          <p style={{
                            fontSize: 13, fontWeight: 700, fontFamily: "monospace", flexShrink: 0,
                            color: m.result === "W" ? "#16a34a" : m.result === "L" ? "#dc2626" : MUTED,
                          }}>
                            {m.myScore}–{m.opponentScore}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: WHITE, border: `1px solid ${BD}`, borderRadius: 12,
                  padding: "40px 24px", textAlign: "center",
                }}>
                  <Trophy style={{ width: 32, height: 32, color: BD, margin: "0 auto 10px" }} />
                  <p style={{ color: MUTED, fontSize: 13 }}>Sin partidos registrados</p>
                </div>
              )}
            </section>
          )}

          {/* ── TAB: Historial ─────────────────────────────────────────────── */}
          {tab === "history" && (
            <section>
              <SectionHeading>Historial de reservas</SectionHeading>
              {allHistory.length === 0 ? (
                <div style={{
                  background: WHITE, border: `1px solid ${BD}`, borderRadius: 12,
                  padding: "40px 24px", textAlign: "center",
                }}>
                  <Clock style={{ width: 32, height: 32, color: BD, margin: "0 auto 10px" }} />
                  <p style={{ color: MUTED, fontSize: 13 }}>Sin historial aún</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {allHistory.map(b => (
                    <div key={b.id} style={{
                      background: WHITE, border: `1px solid ${BD}`,
                      borderRadius: 12, padding: "14px 16px",
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                        background: b.type === "court" ? b.court.color : b.service.color,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: TXT }} className="truncate">
                              {b.type === "court" ? b.court.name : b.service.name}
                            </p>
                            <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }} className="truncate">
                              {b.business.name}
                              {b.type === "appt" && b.staff?.user.name ? ` · ${b.staff.user.name}` : ""}
                            </p>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, flexShrink: 0,
                            background: statusColor(b.status) + "15", color: statusColor(b.status),
                          }}>
                            {statusLabel(b.status)}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 11, color: MUTED }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <Calendar style={{ width: 10, height: 10 }} />
                            {format(new Date(b.startTime), "d MMM yyyy", { locale: es })}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <Clock style={{ width: 10, height: 10 }} />
                            {format(new Date(b.startTime), "HH:mm")}
                          </span>
                          {b.type === "court" && b.price > 0 && (
                            <span style={{ marginLeft: "auto", fontWeight: 700, color: TXT }}>
                              ${Number(b.price).toLocaleString("es-CL")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── TAB: Mis clubs ──────────────────────────────────────────────── */}
          {tab === "clubs" && (
            <section>
              <SectionHeading>Mis clubs vinculados</SectionHeading>
              {businessBenefits.length === 0 ? (
                <div style={{
                  background: WHITE, border: `1px solid ${BD}`, borderRadius: 12,
                  padding: "40px 24px", textAlign: "center",
                }}>
                  <Building2 style={{ width: 32, height: 32, color: BD, margin: "0 auto 10px" }} />
                  <p style={{ color: MUTED, fontSize: 13 }}>Sin clubs vinculados</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {businessBenefits.map(b => {
                    const segLabel: Record<string, string> = { VIP: "VIP", FREQUENT: "Frecuente", REGULAR: "Regular", NEW: "Nuevo", AT_RISK: "Recuperar", INFLUENCER: "Influencer" }
                    const segColor: Record<string, string> = { VIP: "#d97706", FREQUENT: ACCENT, REGULAR: MUTED, NEW: MUTED, AT_RISK: "#dc2626", INFLUENCER: "#9333ea" }
                    const sc = segColor[b.segment] ?? MUTED

                    return (
                      <div key={b.businessId} style={{
                        background: WHITE, border: `1px solid ${BD}`,
                        borderRadius: 14, overflow: "hidden",
                      }}>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "14px 16px", borderBottom: `1px solid ${BD}`,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: "rgba(56,189,248,0.1)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <Building2 style={{ width: 15, height: 15, color: ACCENT }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: TXT }} className="truncate">{b.businessName}</p>
                              <p style={{ fontSize: 11, color: MUTED }}>/{b.businessSlug}</p>
                            </div>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 100, flexShrink: 0,
                            background: sc + "15", color: sc, border: `1px solid ${sc}30`,
                          }}>
                            {segLabel[b.segment] ?? b.segment}
                          </span>
                        </div>
                        <div style={{ padding: "12px 16px 0", display: "flex", gap: 20, fontSize: 12 }}>
                          {b.loyaltyEnabled && (
                            <div>
                              <p style={{ color: MUTED, fontSize: 10 }}>Puntos</p>
                              <p style={{ color: "#d97706", fontWeight: 800, fontSize: 18 }}>{b.loyaltyPoints}</p>
                            </div>
                          )}
                          <div>
                            <p style={{ color: MUTED, fontSize: 10 }}>Saldo</p>
                            <p style={{ color: "#16a34a", fontWeight: 800, fontSize: 18 }}>
                              ${b.creditBalance.toLocaleString("es-CL")}
                            </p>
                            <a
                              href={`/wallet/${b.businessSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 10, color: ACCENT, fontWeight: 600, textDecoration: "none", display: "block", marginTop: 2 }}
                            >
                              + Recargar
                            </a>
                          </div>
                          {b.loyaltyEnabled && b.segmentDiscount > 0 && (
                            <div>
                              <p style={{ color: MUTED, fontSize: 10 }}>Descuento</p>
                              <p style={{ color: ACCENT, fontWeight: 800, fontSize: 18 }}>{b.segmentDiscount}%</p>
                            </div>
                          )}
                        </div>
                        <div style={{ padding: "10px 16px 14px" }}>
                          <button
                            onClick={() => navigateToBooking(b.businessSlug)}
                            style={{
                              width: "100%", padding: "9px 0", borderRadius: 10,
                              background: SB, color: ACCENT,
                              fontSize: 13, fontWeight: 700, cursor: "pointer",
                              border: `1px solid rgba(56,189,248,0.25)`,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            }}>
                            <Plus style={{ width: 14, height: 14 }} />
                            Reservar en {b.businessName.split(" ")[0]}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── TAB: Fidelización ──────────────────────────────────────────── */}
          {tab === "loyalty" && (
            <section>
              <SectionHeading>Puntos por negocio</SectionHeading>
              {businessBenefits.filter(b => b.loyaltyEnabled).length === 0 ? (
                <div style={{
                  background: WHITE, border: `1px solid ${BD}`, borderRadius: 12,
                  padding: "40px 24px", textAlign: "center",
                }}>
                  <Star style={{ width: 32, height: 32, color: BD, margin: "0 auto 10px" }} />
                  <p style={{ color: MUTED, fontSize: 13 }}>Sin beneficios registrados</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {businessBenefits.filter(b => b.loyaltyEnabled).map(b => {
                    const segLabel: Record<string, string> = { VIP: "VIP", FREQUENT: "Frecuente", REGULAR: "Regular", NEW: "Nuevo", AT_RISK: "Recuperar", INFLUENCER: "Influencer" }
                    const isVip = b.segment === "VIP"
                    const progress = b.vipThreshold > 0 ? Math.min(100, Math.round((b.loyaltyPoints / b.vipThreshold) * 100)) : 0

                    return (
                      <div key={b.businessId} style={{
                        background: WHITE, border: `1px solid ${BD}`,
                        borderRadius: 16, overflow: "hidden",
                      }}>
                        {/* Header */}
                        <div style={{
                          padding: "14px 16px", background: SB,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: LTXT }}>{b.businessName}</p>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 100,
                            background: isVip ? "rgba(217,119,6,0.2)" : "rgba(56,189,248,0.15)",
                            color: isVip ? "#f59e0b" : ACCENT,
                          }}>
                            {segLabel[b.segment] ?? b.segment}
                          </span>
                        </div>

                        <div style={{ padding: "16px" }}>
                          {/* Points + credit grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                            <div style={{
                              background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)",
                              borderRadius: 12, padding: "12px", textAlign: "center",
                            }}>
                              <p style={{ fontSize: 26, fontWeight: 900, color: "#d97706", lineHeight: 1 }}>{b.loyaltyPoints}</p>
                              <p style={{ fontSize: 10, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Puntos</p>
                              {b.pointsPerVisit > 0 && (
                                <p style={{ fontSize: 10, color: "rgba(217,119,6,0.6)", marginTop: 3 }}>+{b.pointsPerVisit} por visita</p>
                              )}
                            </div>
                            <div style={{
                              background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)",
                              borderRadius: 12, padding: "12px", textAlign: "center",
                            }}>
                              <p style={{ fontSize: 26, fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>
                                ${b.creditBalance.toLocaleString("es-CL")}
                              </p>
                              <p style={{ fontSize: 10, color: MUTED, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Crédito</p>
                              <p style={{ fontSize: 10, color: "rgba(22,163,74,0.6)", marginTop: 3 }}>Uso automático</p>
                            </div>
                          </div>

                          {/* Progress to VIP */}
                          {!isVip && b.vipThreshold > 0 && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
                                <span style={{ color: MUTED }}>Progreso VIP</span>
                                <span style={{ color: "#d97706", fontWeight: 700 }}>
                                  {b.ptsToNext > 0 ? `Faltan ${b.ptsToNext} pts` : "¡Casi!"}
                                </span>
                              </div>
                              <div style={{ height: 6, borderRadius: 100, background: "#f1f5f9", overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", borderRadius: 100,
                                  width: `${progress}%`,
                                  background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                                  transition: "width 0.5s ease",
                                }} />
                              </div>
                              <p style={{ fontSize: 10, color: MUTED, marginTop: 5 }}>
                                {b.loyaltyPoints} / {b.vipThreshold} puntos para VIP
                              </p>
                            </div>
                          )}

                          {isVip && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "10px 14px", borderRadius: 10,
                              background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)",
                            }}>
                              <Star style={{ width: 16, height: 16, color: "#d97706", flexShrink: 0 }} />
                              <p style={{ fontSize: 13, fontWeight: 700, color: "#d97706" }}>Cliente VIP</p>
                              {b.segmentDiscount > 0 && (
                                <span style={{
                                  marginLeft: "auto", fontSize: 11, fontWeight: 700,
                                  padding: "2px 8px", borderRadius: 100,
                                  background: "rgba(217,119,6,0.12)", color: "#d97706",
                                }}>
                                  -{b.segmentDiscount}% descuento
                                </span>
                              )}
                            </div>
                          )}

                          {/* Discount (non-VIP) */}
                          {!isVip && b.segmentDiscount > 0 && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 8, marginTop: 10,
                              padding: "10px 14px", borderRadius: 10,
                              background: "rgba(56,189,248,0.06)", border: `1px solid rgba(56,189,248,0.2)`,
                            }}>
                              <Zap style={{ width: 14, height: 14, color: ACCENT, flexShrink: 0 }} />
                              <p style={{ fontSize: 12, color: MUTED }}>
                                Descuento <span style={{ fontWeight: 800, color: ACCENT }}>{b.segmentDiscount}%</span> activo para tu segmento
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

        </div>
      </div>

      {/* ── Cancel confirm modal ────────────────────────────────────────────── */}
      {confirmCancel && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 16px 16px",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }} onClick={() => setConfirmCancel(null)}>
          <div style={{
            width: "100%", maxWidth: 400, borderRadius: 24, padding: 24,
            background: WHITE, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: "rgba(220,38,38,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <X style={{ width: 20, height: 20, color: "#dc2626" }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: TXT }}>Cancelar reserva</p>
                <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{confirmCancel.name}</p>
              </div>
            </div>

            {(confirmCancel.paidAmount > 0 || confirmCancel.hasVoucher) ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>
                  {confirmCancel.paidAmount > 0
                    ? <>Monto pagado: <strong style={{ color: TXT }}>${confirmCancel.paidAmount.toLocaleString("es-CL")}</strong> — ¿cómo quieres recuperarlo?</>
                    : "Tienes un comprobante de transferencia enviado. Si el pago fue acreditado, ¿cómo quieres recuperarlo?"}
                </p>

                {confirmCancel.paidOnline && (
                  <button
                    onClick={() => handleCancel(confirmCancel.type, confirmCancel.id, "refund")}
                    disabled={!!cancellingId}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 14,
                      background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.25)",
                      textAlign: "left", cursor: "pointer", width: "100%",
                    }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: "rgba(56,189,248,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {cancellingId === confirmCancel.id
                        ? <Loader2 style={{ width: 18, height: 18, color: ACCENT }} className="animate-spin" />
                        : <CreditCard style={{ width: 18, height: 18, color: ACCENT }} />}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: TXT }}>Reembolso automático</p>
                      <p style={{ fontSize: 11, color: MUTED }}>De vuelta a tu método de pago original</p>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => handleCancel(confirmCancel.type, confirmCancel.id, "credit")}
                  disabled={!!cancellingId}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 14,
                    background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.25)",
                    textAlign: "left", cursor: "pointer", width: "100%",
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: "rgba(22,163,74,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {cancellingId === confirmCancel.id
                      ? <Loader2 style={{ width: 18, height: 18, color: "#16a34a" }} className="animate-spin" />
                      : <Gift style={{ width: 18, height: 18, color: "#16a34a" }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: TXT }}>Abonar a mi cuenta</p>
                    <p style={{ fontSize: 11, color: MUTED }}>Crédito para tu próxima reserva</p>
                  </div>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 13, color: MUTED }}>¿Confirmas la cancelación de esta reserva?</p>
                <button
                  onClick={() => handleCancel(confirmCancel.type, confirmCancel.id, "refund")}
                  disabled={!!cancellingId}
                  style={{
                    height: 50, borderRadius: 14, fontSize: 13, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "rgba(220,38,38,0.1)", color: "#dc2626",
                    border: "1px solid rgba(220,38,38,0.25)", cursor: "pointer", width: "100%",
                  }}>
                  {cancellingId ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <X style={{ width: 16, height: 16 }} />}
                  Confirmar cancelación
                </button>
              </div>
            )}

            {cancelError && (
              <p style={{
                fontSize: 12, padding: "10px 14px", borderRadius: 10, marginTop: 10,
                background: "rgba(220,38,38,0.08)", color: "#dc2626",
              }}>
                {cancelError}
              </p>
            )}

            <button onClick={() => { setConfirmCancel(null); setCancelError(null) }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                width: "100%", marginTop: 14, fontSize: 12, color: MUTED,
                background: "transparent", border: "none", cursor: "pointer",
              }}>
              <ArrowLeft style={{ width: 13, height: 13 }} />Volver
            </button>
          </div>
        </div>
      )}

      {/* ── Cancel recurring series modal ─────────────────────────────────── */}
      {cancelRecurringModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 16px 16px",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }} onClick={() => { if (!cancellingRecurring) setCancelRecurringModal(null) }}>
          <div style={{
            width: "100%", maxWidth: 420, borderRadius: 20,
            background: "#1a1a1e", border: "1px solid rgba(255,255,255,0.1)",
            padding: "24px 20px 20px",
          }} onClick={e => e.stopPropagation()}>
            <p style={{ color: "#fff", fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
              Cancelar reservas recurrentes
            </p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 20 }}>
              ¿Cancelar todas las sesiones futuras de <strong style={{ color: "rgba(255,255,255,0.8)" }}>{cancelRecurringModal.courtName}</strong>?
            </p>
            <button
              onClick={() => handleCancelRecurringSeries(cancelRecurringModal.recurringGroupId)}
              disabled={cancellingRecurring}
              style={{
                width: "100%", padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: "rgba(239,68,68,0.15)", color: "#f87171",
                border: "1px solid rgba(239,68,68,0.3)", cursor: cancellingRecurring ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              {cancellingRecurring ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <X style={{ width: 16, height: 16 }} />}
              Cancelar sesiones futuras
            </button>
            <button onClick={() => setCancelRecurringModal(null)} disabled={cancellingRecurring}
              style={{
                width: "100%", marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.4)",
                background: "transparent", border: "none", cursor: "pointer",
              }}>
              Volver
            </button>
          </div>
        </div>
      )}

      {/* ── Business picker modal ──────────────────────────────────────────── */}
      {showBookPicker && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 16px 16px",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }} onClick={() => setShowBookPicker(false)}>
          <div style={{
            width: "100%", maxWidth: 400, borderRadius: 24, overflow: "hidden",
            background: WHITE, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{
              background: SB, padding: "20px 20px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: LTXT }}>¿Dónde quieres reservar?</p>
                <p style={{ fontSize: 11, color: LMUTED, marginTop: 3 }}>Selecciona el club</p>
              </div>
              <button onClick={() => setShowBookPicker(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: LMUTED }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Club list */}
            <div style={{ padding: "12px 16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {businessBenefits.map(b => (
                <button
                  key={b.businessId}
                  onClick={() => { setShowBookPicker(false); navigateToBooking(b.businessSlug) }}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 14,
                    background: "#f8fafc", border: `1px solid ${BD}`,
                    cursor: "pointer", textAlign: "left", width: "100%",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BD)}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0, overflow: "hidden",
                    background: b.businessCover ? "transparent" : (b.businessColor + "18"),
                    border: `1.5px solid ${b.businessColor}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {b.businessCover ? (
                      <img
                        src={b.businessCover}
                        alt={b.businessName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Building2 style={{ width: 20, height: 20, color: b.businessColor }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: TXT }}>{b.businessName}</p>
                    <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>agendamok.cl/book/{b.businessSlug}</p>
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: MUTED, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Success toast ───────────────────────────────────────────────────── */}
      {cancelSuccess && (
        <div style={{
          position: "fixed", bottom: 24, left: 0, right: 0,
          display: "flex", justifyContent: "center", padding: "0 16px", zIndex: 50,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 16, maxWidth: 400, width: "100%",
            background: WHITE, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            border: "1px solid rgba(22,163,74,0.3)",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: "rgba(22,163,74,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: TXT, flex: 1 }}>{cancelSuccess.message}</p>
            <button onClick={() => setCancelSuccess(null)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
              <X style={{ width: 16, height: 16, color: MUTED }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
