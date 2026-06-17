"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Check, Clock, DollarSign, ChevronLeft, User } from "lucide-react"
import { cn } from "@/lib/utils"

type Service = {
  id: string
  name: string
  duration: number
  price: number | string
  color: string
  description: string | null
  category: { name: string } | null
}

type StaffMember = {
  id: string
  color: string
  user: { name: string | null; image: string | null }
  services: { id: string }[]
}

type Business = {
  id: string
  name: string
  logo: string | null
  services: Service[]
  staff: StaffMember[]
}

interface Props {
  business: Business
  embed?: boolean
}

type BookingState = {
  serviceId: string | null
  staffId: string | null
  date: Date | null
  time: string | null
  name: string
  email: string
  phone: string
}

type Step = 1 | 2 | 3 | 4 | 5

export function BookingFlow({ business, embed = false }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)

  const [booking, setBooking] = useState<BookingState>({
    serviceId: null,
    staffId: null,
    date: null,
    time: null,
    name: "",
    email: "",
    phone: "",
  })

  const selectedService = business.services.find((s) => s.id === booking.serviceId)
  const selectedStaff = business.staff.find((s) => s.id === booking.staffId)

  const eligibleStaff = booking.serviceId
    ? business.staff.filter((s) => s.services.some((sv) => sv.id === booking.serviceId))
    : business.staff

  async function fetchSlots(date: Date, staffId: string | null) {
    const params = new URLSearchParams({
      businessId: business.id,
      date: format(date, "yyyy-MM-dd"),
      serviceId: booking.serviceId!,
      ...(staffId ? { staffId } : {}),
    })
    const res = await fetch(`/api/public/availability?${params}`)
    const data = await res.json()
    setAvailableSlots(data.slots || [])
  }

  async function handleDateSelect(date: Date | undefined) {
    if (!date) return
    setBooking((b) => ({ ...b, date, time: null }))
    await fetchSlots(date, booking.staffId)
  }

  async function handleStaffSelect(staffId: string | null) {
    setBooking((b) => ({ ...b, staffId, time: null }))
    if (booking.date) {
      await fetchSlots(booking.date, staffId)
    }
    setStep(3)
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          serviceId: booking.serviceId,
          staffId: booking.staffId,
          date: booking.date ? format(booking.date, "yyyy-MM-dd") : null,
          time: booking.time,
          clientName: booking.name,
          clientEmail: booking.email,
          clientPhone: booking.phone,
        }),
      })
      if (!res.ok) throw new Error()
      setConfirmed(true)
    } catch {
      toast.error("Error al confirmar el turno. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (confirmed) {
    return (
      <div className={embed ? "flex items-center justify-center p-4" : "min-h-screen bg-gray-50 flex items-center justify-center p-4"}>
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">¡Turno confirmado!</h1>
          <p className="text-muted-foreground">
            Te enviamos la confirmación a <strong>{booking.email}</strong>.<br />
            Te esperamos el {booking.date && format(booking.date, "EEEE d 'de' MMMM", { locale: es })} a las {booking.time}hs.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servicio</span>
              <span className="font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profesional</span>
              <span className="font-medium">{selectedStaff?.user.name || "Cualquiera"}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const steps = ["Servicio", "Profesional", "Fecha y hora", "Datos", "Confirmar"]

  return (
    <div className={embed ? "" : "min-h-screen bg-gray-50"}>
      {/* Header — oculto en modo embed */}
      {!embed && (
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
              {business.name[0]}
            </div>
            <div>
              <h1 className="font-semibold">{business.name}</h1>
              <p className="text-xs text-muted-foreground">Reserva tu turno en línea</p>
            </div>
          </div>
        </header>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-1 min-w-0">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0",
                  step > i + 1 ? "bg-indigo-600 text-white" :
                  step === i + 1 ? "bg-indigo-600 text-white" :
                  "bg-gray-200 text-gray-500"
                )}
              >
                {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={cn("text-xs hidden sm:block truncate", step === i + 1 ? "text-indigo-600 font-medium" : "text-muted-foreground")}>
                {label}
              </span>
              {i < steps.length - 1 && <div className={cn("flex-1 h-px mx-1", step > i + 1 ? "bg-indigo-600" : "bg-gray-200")} />}
            </div>
          ))}
        </div>

        {/* Step 1: Service */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">¿Qué servicio necesitás?</h2>
            {Object.entries(
              business.services.reduce((acc, s) => {
                const cat = s.category?.name || "Otros"
                if (!acc[cat]) acc[cat] = []
                acc[cat].push(s)
                return acc
              }, {} as Record<string, Service[]>)
            ).map(([cat, services]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</p>
                <div className="space-y-2">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => { setBooking((b) => ({ ...b, serviceId: service.id })); setStep(2) }}
                      className={cn(
                        "w-full bg-white border rounded-xl p-4 text-left flex items-center justify-between hover:border-indigo-300 transition-colors",
                        booking.serviceId === service.id && "border-indigo-600 bg-indigo-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4 space-y-1">
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <DollarSign className="w-3 h-3" />
                          {Number(service.price).toLocaleString("es-AR")}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {service.duration} min
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Staff */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-lg">¿Con quién querés atenderte?</h2>
            </div>
            <button
              onClick={() => handleStaffSelect(null)}
              className="w-full bg-white border rounded-xl p-4 text-left flex items-center gap-3 hover:border-indigo-300 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Cualquier profesional disponible</p>
                <p className="text-xs text-muted-foreground">Te asignamos al primero disponible</p>
              </div>
            </button>
            {eligibleStaff.map((member) => (
              <button
                key={member.id}
                onClick={() => handleStaffSelect(member.id)}
                className="w-full bg-white border rounded-xl p-4 text-left flex items-center gap-3 hover:border-indigo-300 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: member.color }}
                >
                  {member.user.name?.[0] || "?"}
                </div>
                <p className="font-medium">{member.user.name}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Date + Time */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(2)} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-lg">Elige fecha y hora</h2>
            </div>
            <div className="bg-white border rounded-xl p-4">
              <Calendar
                mode="single"
                selected={booking.date || undefined}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                locale={es}
                className="mx-auto"
              />
            </div>
            {booking.date && availableSlots.length > 0 && (
              <div>
                <p className="font-medium mb-2 text-sm">Horarios disponibles</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => { setBooking((b) => ({ ...b, time: slot })); setStep(4) }}
                      className={cn(
                        "py-2 px-3 border rounded-lg text-sm font-medium hover:border-indigo-300 transition-colors",
                        booking.time === slot && "border-indigo-600 bg-indigo-50 text-indigo-700"
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {booking.date && availableSlots.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay horarios disponibles para este día. Probá con otra fecha.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Client data */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(3)} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-lg">Tus datos</h2>
            </div>
            <div className="bg-white border rounded-xl p-4 space-y-4">
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input
                  placeholder="Juan García"
                  value={booking.name}
                  onChange={(e) => setBooking((b) => ({ ...b, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="juan@email.com"
                  value={booking.email}
                  onChange={(e) => setBooking((b) => ({ ...b, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  placeholder="+54 11 1234-5678"
                  value={booking.phone}
                  onChange={(e) => setBooking((b) => ({ ...b, phone: e.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                disabled={!booking.name || !booking.email}
                onClick={() => setStep(5)}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(4)} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-lg">Confirma tu turno</h2>
            </div>
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <h3 className="font-medium mb-3">Resumen de reserva</h3>
              {[
                { label: "Servicio", value: selectedService?.name },
                { label: "Profesional", value: selectedStaff?.user.name || "Cualquiera disponible" },
                { label: "Fecha", value: booking.date ? format(booking.date, "EEEE d 'de' MMMM", { locale: es }) : "" },
                { label: "Hora", value: booking.time ? `${booking.time}hs` : "" },
                { label: "Duración", value: selectedService ? `${selectedService.duration} min` : "" },
                { label: "Precio", value: selectedService ? `$${Number(selectedService.price).toLocaleString("es-AR")}` : "" },
                { label: "Cliente", value: booking.name },
                { label: "Email", value: booking.email },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium capitalize">{value}</span>
                </div>
              ))}
            </div>
            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading}>
              {loading ? "Confirmando..." : "Confirmar turno"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Recibirás una confirmación por email con los detalles del turno.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

