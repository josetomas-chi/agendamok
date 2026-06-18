"use client"

import React, { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { format, addDays, startOfToday, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Check, ChevronLeft, ChevronRight, Clock, MapPin, Calendar, User, Loader2 } from "lucide-react"

type Service = { id: string; name: string; description: string | null; duration: number; price: number; color: string }
type Staff = { id: string; color: string; user: { name: string | null; image: string | null } }
type Business = {
  id: string; name: string; category: string; description: string | null
  logo: string | null; phone: string | null; address: string | null; city: string | null
  services: Service[]; staff: Staff[]
}

type Step = "service" | "staff" | "datetime" | "form" | "confirmed"

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>("service")
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const today = startOfToday()

  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/book/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setBusiness(d.business))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

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
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return
    if (!form.name || !form.email) return
    setSubmitting(true)
    const startTime = new Date(`${selectedDate}T${selectedTime}`).toISOString()
    const r = await fetch(`/api/book/${slug}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        startTime,
        clientName: form.name,
        clientEmail: form.email,
        clientPhone: form.phone || undefined,
        notes: form.notes || undefined,
      }),
    })
    if (r.ok) {
      setStep("confirmed")
    } else {
      const d = await r.json()
      alert(d.error || "Error al confirmar")
    }
    setSubmitting(false)
  }

  function resetBooking() {
    setStep("service")
    setSelectedService(null)
    setSelectedStaff(null)
    setSelectedDate("")
    setSelectedTime("")
    setForm({ name: "", email: "", phone: "", notes: "" })
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1c1e]">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
    </div>
  )

  if (notFound || !business) return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1c1e] text-white/50">
      <div className="text-center">
        <p className="text-lg font-medium text-white/70">Negocio no encontrado</p>
        <p className="text-sm mt-1">El link que seguiste no existe o esta inactivo.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1c1c1e] text-[#f4f4f5]">
      <div className="border-b border-white/10 bg-[#2c2c30]">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
          {business.logo ? (
            <img src={business.logo} alt={business.name} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-sky-400" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg">{business.name}</h1>
            <p className="text-sm text-white/40">{business.category}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {step !== "confirmed" && (
          <div className="flex items-center gap-2 mb-8">
            {(["service", "staff", "datetime", "form"] as Step[]).map((s, i) => {
              const stepIndex = ["service", "staff", "datetime", "form"].indexOf(step)
              const isDone = i < stepIndex
              const isCurrent = s === step
              return (
                <React.Fragment key={s}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all ${
                    isDone ? "bg-sky-500 text-white" :
                    isCurrent ? "bg-sky-500/20 border border-sky-400 text-sky-400" :
                    "bg-white/5 text-white/30"
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i < 3 && <div className={`flex-1 h-px ${i < stepIndex ? "bg-sky-500/50" : "bg-white/10"}`} />}
                </React.Fragment>
              )
            })}
          </div>
        )}

        {step === "service" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Elige un servicio</h2>
            <div className="grid gap-3">
              {business.services.map(s => (
                <button key={s.id} onClick={() => { setSelectedService(s); setStep("staff") }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-all text-left">
                  <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    {s.description && <p className="text-sm text-white/40 truncate">{s.description}</p>}
                    <span className="text-xs text-white/40 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {s.duration} min
                    </span>
                  </div>
                  <p className="font-semibold text-sky-300 flex-shrink-0">${Number(s.price).toLocaleString("es-CL")}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "staff" && (
          <div className="space-y-4">
            <button onClick={() => setStep("service")} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" /> Cambiar servicio
            </button>
            <h2 className="text-lg font-semibold">Elige un profesional</h2>
            <div className="grid gap-3">
              <button onClick={() => { setSelectedStaff(null); setStep("datetime") }}
                className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-all text-left">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-white/40" />
                </div>
                <div>
                  <p className="font-medium">Sin preferencia</p>
                  <p className="text-xs text-white/40">Cualquier profesional disponible</p>
                </div>
              </button>
              {business.staff.map(s => (
                <button key={s.id} onClick={() => { setSelectedStaff(s); setStep("datetime") }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-all text-left">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                    style={{ backgroundColor: s.color + "40", border: `2px solid ${s.color}` }}>
                    {s.user.name?.[0] ?? "?"}
                  </div>
                  <p className="font-medium">{s.user.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "datetime" && (
          <div className="space-y-5">
            <button onClick={() => setStep("staff")} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" /> Cambiar profesional
            </button>
            <h2 className="text-lg font-semibold">Elige fecha y hora</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-white/50">
                  {format(weekDays[0], "d MMM", { locale: es })} - {format(weekDays[6], "d MMM yyyy", { locale: es })}
                </span>
                <button onClick={() => setWeekOffset(w => w + 1)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map(day => {
                  const key = format(day, "yyyy-MM-dd")
                  const isPast = day < today
                  const isSelected = key === selectedDate
                  return (
                    <button key={key} disabled={isPast} onClick={() => setSelectedDate(key)}
                      className={`flex flex-col items-center py-2.5 rounded-xl transition-all disabled:opacity-30 ${
                        isSelected ? "bg-sky-500 text-white" : "bg-white/5 hover:bg-white/10 text-white/70"
                      }`}>
                      <span className="text-[10px] uppercase tracking-wide">{format(day, "EEE", { locale: es })}</span>
                      <span className="text-sm font-semibold mt-0.5">{format(day, "d")}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            {selectedDate && (
              <div className="space-y-2">
                <p className="text-sm text-white/50">
                  {format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-white/30 text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando horarios...
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-white/30 py-4">Sin horarios disponibles para este dia.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button key={slot} onClick={() => { setSelectedTime(slot); setStep("form") }}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                          selectedTime === slot
                            ? "bg-sky-500 text-white"
                            : "bg-white/5 hover:bg-sky-500/20 hover:text-sky-300 text-white/70"
                        }`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === "form" && (
          <div className="space-y-5">
            <button onClick={() => setStep("datetime")} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" /> Cambiar horario
            </button>
            <h2 className="text-lg font-semibold">Tus datos</h2>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedService?.color }} />
                <span className="font-medium">{selectedService?.name}</span>
                <span className="text-white/40">· {selectedService?.duration} min</span>
              </div>
              {selectedStaff && (
                <div className="flex items-center gap-2 text-white/50">
                  <User className="w-3.5 h-3.5" /> {selectedStaff.user.name}
                </div>
              )}
              <div className="flex items-center gap-2 text-white/50">
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate && format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime}
              </div>
            </div>
            <div className="space-y-3">
              {[
                { key: "name", label: "Nombre *", type: "text", placeholder: "Tu nombre" },
                { key: "email", label: "Email *", type: "email", placeholder: "tu@email.com" },
                { key: "phone", label: "Telefono", type: "tel", placeholder: "+56 9 1234 5678" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="text-sm text-white/50 block mb-1.5">{label}</label>
                  <input type={type} value={(form as Record<string, string>)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full h-10 rounded-xl border border-white/10 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                    style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }} />
                </div>
              ))}
              <div>
                <label className="text-sm text-white/50 block mb-1.5">Notas (opcional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  placeholder="Algun comentario para el profesional..."
                  className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-sky-400"
                  style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }} />
              </div>
            </div>
            <button onClick={handleConfirm} disabled={submitting || !form.name || !form.email}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</> : "Confirmar turno"}
            </button>
          </div>
        )}

        {step === "confirmed" && (
          <div className="text-center space-y-5 py-8">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Turno confirmado!</h2>
              <p className="text-white/50 mt-1">Te enviamos la confirmacion a {form.email}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedService?.color }} />
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              {selectedStaff && (
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <User className="w-3.5 h-3.5" /> {selectedStaff.user.name}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Calendar className="w-3.5 h-3.5" />
                {selectedDate && format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime}
              </div>
              {(business.address || business.city) && (
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <MapPin className="w-3.5 h-3.5" />
                  {[business.address, business.city].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
            <button onClick={resetBooking} className="text-sm text-sky-400 hover:text-sky-300 transition-colors">
              Reservar otro turno
            </button>
          </div>
        )}
      </div>
    </div>
  )
}