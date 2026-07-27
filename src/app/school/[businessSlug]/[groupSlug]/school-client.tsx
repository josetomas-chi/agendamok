"use client"
import React, { useState, useEffect } from "react"
import { Loader2, Calendar, Clock, Users, DollarSign, ChevronRight, Check } from "lucide-react"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const BILLING: Record<string, string> = { MONTHLY: "/ mes", QUARTERLY: "/ trimestre", SEMESTER: "/ semestre", ANNUAL: "/ año" }

type Business = { id: string; name: string; logo: string | null; primaryColor: string | null; phone: string | null; city: string | null }
type Group = {
  id: string; name: string; sport: string | null; level: string | null; days: number[]
  startTime: string; endTime: string; maxCapacity: number; monthlyPrice: number
  billingCycle: string; color: string; startDate: string | null; endDate: string | null
  notes: string | null; image: string | null; slug: string | null
  coach: { name: string; specialty: string | null; user: { name: string | null; image: string | null } } | null
  _count: { enrollments: number }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })
}

function fmtPrice(p: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(p)
}

export default function SchoolGroupClient({ businessSlug, groupSlug }: { businessSlug: string; groupSlug: string }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form
  const [name, setName] = useState("")
  const [rut, setRut] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<"PENDING" | "ALREADY_ENROLLED" | "FULL" | "ERROR" | null>(null)

  useEffect(() => {
    fetch(`/api/school/${businessSlug}/${groupSlug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setBusiness(d.business); setGroup(d.group) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [businessSlug, groupSlug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !rut.trim()) return
    setSubmitting(true)
    try {
      const r = await fetch(`/api/school/${businessSlug}/${groupSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rut, email, phone, notes: formNotes }),
      })
      const d = await r.json()
      if (r.status === 409) setSubmitResult("FULL")
      else setSubmitResult(d.status === "ALREADY_ENROLLED" ? "ALREADY_ENROLLED" : "PENDING")
    } catch {
      setSubmitResult("ERROR")
    }
    setSubmitting(false)
  }

  const accent = group?.color ?? business?.primaryColor ?? "#38bdf8"
  const spotsLeft = group ? group.maxCapacity - group._count.enrollments : 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0f11" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#38bdf8" }} />
    </div>
  )

  if (notFound || !business || !group) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0f11" }}>
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-white">Grupo no encontrado</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>El link que seguiste no existe o está inactivo.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: "#0f0f11" }}>
      {/* Hero image */}
      {group.image ? (
        <div className="relative h-56 md:h-72 w-full overflow-hidden">
          <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(15,15,17,0) 40%, rgba(15,15,17,1))" }} />
        </div>
      ) : (
        <div className="h-32 w-full" style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}08)` }} />
      )}

      <div className="max-w-lg mx-auto px-4 pb-16" style={{ marginTop: group.image ? "-2rem" : "0" }}>
        {/* Business header */}
        <div className="flex items-center gap-2 mb-4">
          {business.logo
            ? <img src={business.logo} alt={business.name} className="w-6 h-6 rounded-lg object-cover" />
            : <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: accent, color: "#0d1b2a" }}>{business.name[0]}</div>}
          <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>{business.name}</span>
        </div>

        {/* Group title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            {group.sport && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${accent}22`, color: accent }}>
                {group.sport}
              </span>
            )}
            {group.level && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                {group.level}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white">{group.name}</h1>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <InfoCard icon={<Calendar className="w-4 h-4" />} accent={accent}
            label="Días"
            value={group.days.map(d => DAYS[d]).join(" · ")} />
          <InfoCard icon={<Clock className="w-4 h-4" />} accent={accent}
            label="Horario"
            value={`${group.startTime} – ${group.endTime}`} />
          <InfoCard icon={<DollarSign className="w-4 h-4" />} accent={accent}
            label="Precio"
            value={`${fmtPrice(group.monthlyPrice)} ${BILLING[group.billingCycle] ?? "/mes"}`} />
          <InfoCard icon={<Users className="w-4 h-4" />} accent={accent}
            label="Cupos"
            value={spotsLeft > 0 ? `${spotsLeft} disponibles` : "Sin cupos"} />
          {group.startDate && (
            <InfoCard icon={<Calendar className="w-4 h-4" />} accent={accent}
              label="Inicio"
              value={fmtDate(group.startDate)} />
          )}
          {group.endDate && (
            <InfoCard icon={<Calendar className="w-4 h-4" />} accent={accent}
              label="Término"
              value={fmtDate(group.endDate)} />
          )}
        </div>

        {/* Coach */}
        {group.coach && (
          <div className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {group.coach.user.image
              ? <img src={group.coach.user.image} alt="" className="w-10 h-10 rounded-full object-cover" />
              : <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                  style={{ background: accent, color: "#0d1b2a" }}>
                  {(group.coach.user.name ?? group.coach.name ?? "?")[0]}
                </div>}
            <div>
              <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>Entrenador/a</p>
              <p className="text-sm font-bold text-white">{group.coach.user.name ?? group.coach.name}</p>
              {group.coach.specialty && <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{group.coach.specialty}</p>}
            </div>
          </div>
        )}

        {/* Notes */}
        {group.notes && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Descripción</p>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{group.notes}</p>
          </div>
        )}

        {/* Enrollment form */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
          <div className="px-5 py-4" style={{ background: `${accent}18`, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm font-black text-white">Inscribirse</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Completa tus datos y nos contactamos para confirmar</p>
          </div>

          {submitResult === "PENDING" && (
            <div className="px-5 py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: `${accent}22` }}>
                <Check className="w-6 h-6" style={{ color: accent }} />
              </div>
              <p className="text-base font-black text-white">¡Solicitud enviada!</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Recibirás una confirmación pronto. También puedes contactarnos al {business.phone ?? "club"} para más información.
              </p>
            </div>
          )}
          {submitResult === "ALREADY_ENROLLED" && (
            <div className="px-5 py-8 text-center space-y-2">
              <p className="text-base font-black text-white">Ya estás inscrito/a</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Tu RUT ya figura en este grupo.</p>
            </div>
          )}
          {submitResult === "FULL" && (
            <div className="px-5 py-8 text-center space-y-2">
              <p className="text-base font-black" style={{ color: "#f87171" }}>Grupo sin cupos</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>El grupo está completo. Contáctanos para quedar en lista de espera.</p>
            </div>
          )}
          {submitResult === "ERROR" && (
            <div className="px-5 py-2 text-center">
              <p className="text-sm" style={{ color: "#f87171" }}>Error al enviar. Intenta de nuevo.</p>
            </div>
          )}

          {!submitResult && (
            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4" style={{ background: "#141416" }}>
              <Field label="Nombre completo *">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del alumno"
                  className="w-full h-10 rounded-xl px-3 text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </Field>
              <Field label="RUT *">
                <input value={rut} onChange={e => setRut(e.target.value)} placeholder="12345678-9"
                  className="w-full h-10 rounded-xl px-3 text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </Field>
              <Field label="Email">
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="para recibir confirmación" type="email"
                  className="w-full h-10 rounded-xl px-3 text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </Field>
              <Field label="Teléfono">
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+56 9 1234 5678"
                  className="w-full h-10 rounded-xl px-3 text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </Field>
              <Field label="Comentarios">
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Nivel, edad, consultas..." rows={2}
                  className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </Field>
              <button type="submit" disabled={submitting || !name.trim() || !rut.trim()}
                className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: accent, color: "#0d1b2a" }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Enviar solicitud <ChevronRight className="w-4 h-4" /></>}
              </button>
              <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
                Un integrante del club confirmará tu inscripción
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            {business.name}{business.city ? ` · ${business.city}` : ""} · Powered by AgendaMok
          </p>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-3 flex items-start gap-2.5"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="mt-0.5 flex-shrink-0" style={{ color: accent }}>{icon}</div>
      <div>
        <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
        <p className="text-sm font-bold text-white leading-tight">{value}</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</label>
      {children}
    </div>
  )
}
