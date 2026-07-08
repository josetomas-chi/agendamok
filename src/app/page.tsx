"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Check, X, Minus, Calendar, Users, CreditCard, Bell, BarChart3, Globe, ArrowRight, Star, Percent, MapPin, FileText, Stethoscope, Key, ChevronDown, Rocket, Scissors, HelpCircle, Menu, Layers, CalendarDays, Trophy, CalendarX2, UserCheck, TrendingUp, type LucideIcon } from "lucide-react"
import { MokIcon } from "@/components/ui/mok-icon"
import { BusinessCarousel } from "@/components/landing/business-carousel"

const features = [
  { icon: Calendar, title: "Calendario inteligente", desc: "Vista semanal y diaria por profesional. Arrastra y suelta para mover turnos al instante." },
  { icon: Globe, title: "Reservas online 24/7", desc: "Tus clientes reservan desde el celular a cualquier hora, sin llamar ni enviar mensajes." },
  { icon: Users, title: "Gestión de equipo", desc: "Perfiles, horarios semanales, comisiones automáticas y acceso diferenciado por profesional." },
  { icon: Bell, title: "Recordatorios automáticos", desc: "Email de confirmación y recordatorio antes de cada turno. Menos ausencias, más ingresos." },
  { icon: CreditCard, title: "Cobros y pagos", desc: "POS integrado, historial de pagos por turno y control de caja en un solo lugar." },
  { icon: BarChart3, title: "Reportes en tiempo real", desc: "Ingresos, ocupación, servicios más vendidos y métricas clave actualizadas al instante." },
  { icon: Star, title: "Encuestas de satisfacción", desc: "Se envían automáticamente al completar un turno. Mide tu NPS y lee las reseñas de tus clientes." },
  { icon: Percent, title: "Comisiones de staff", desc: "Calcula automáticamente las comisiones por servicio. Liquida con un clic y lleva el historial." },
  { icon: Stethoscope, title: "Ficha clínica", desc: "Para negocios de salud: historial médico, alergias, notas de visita y campos personalizables." },
  { icon: MapPin, title: "Múltiples sedes", desc: "Gestiona varias ubicaciones desde una sola cuenta. Asigna staff y servicios por sede." },
  { icon: FileText, title: "Presupuestos y cotizaciones", desc: "Crea cotizaciones profesionales en segundos. El cliente acepta, rechaza o pide cambios." },
  { icon: Key, title: "API pública", desc: "Conecta AgendaMok con tu web, app o sistema de gestión propio usando nuestra API REST." },
]

const plans = [
  {
    name: "Starter",
    price: "9.900",
    description: "Para independientes y negocios que están comenzando",
    features: [
      "1 profesional",
      "Turnos ilimitados",
      "Booking online 24/7",
      "CRM de clientes",
      "Pagos online y POS",
      "Reportes básicos",
      "Recordatorios por email",
      "500 emails marketing/mes",
    ],
    cta: "Empezar — 30 días gratis",
    href: "/register?plan=starter",
    highlight: false,
  },
  {
    name: "Negocio",
    price: "24.900",
    description: "Para negocios en crecimiento con equipo",
    features: [
      "Hasta 5 profesionales",
      "Todo lo del plan Starter",
      "Gift cards",
      "Encuestas de satisfacción",
      "Comisiones de staff",
      "Presupuestos y cotizaciones",
      "Boletas electrónicas (Bsale)",
      "2.000 emails marketing/mes",
      "Soporte por chat",
    ],
    cta: "Probar gratis",
    href: "/register?plan=negocio",
    highlight: true,
  },
  {
    name: "Pro",
    price: "39.900",
    description: "Para empresas y clínicas con múltiples profesionales",
    features: [
      "Profesionales ilimitados",
      "Todo lo del plan Negocio",
      "Ficha clínica personalizable",
      "Múltiples sedes",
      "5.000 emails marketing/mes",
      "API access",
      "Soporte prioritario",
    ],
    cta: "Probar gratis",
    href: "/register?plan=pro",
    highlight: false,
  },
]

const helpItems: { category: string; icon: LucideIcon; steps: { title: string; content: string }[] }[] = [
  {
    category: "Primeros pasos",
    icon: Rocket,
    steps: [
      { title: "Crear tu cuenta", content: "Ingresa a agendamok.cl y haz clic en «Empezar gratis». Completa tu email y contraseña — no necesitas tarjeta de crédito. En menos de 1 minuto tienes acceso al panel." },
      { title: "Configurar los datos de tu negocio", content: "En el panel, ve a Configuración → Negocio. Allí completas el nombre, dirección, teléfono y categoría. También puedes subir tu logo y escribir una descripción que verán tus clientes al reservar." },
      { title: "Configurar tu página de reservas pública", content: "En Configuración → Página de reservas encuentras tu link único (ej: agendamok.cl/book/mi-negocio). Puedes personalizar el mensaje de bienvenida y el horario de atención general. Comparte ese link en Instagram, WhatsApp o Google." },
    ],
  },
  {
    category: "Servicios y profesionales",
    icon: Scissors,
    steps: [
      { title: "Agregar tus servicios", content: "En el menú lateral ve a Servicios → Nuevo servicio. Completa el nombre (ej: «Corte de cabello»), duración en minutos, precio y color identificador. Puedes crear todos los que necesites y agruparlos por categorías." },
      { title: "Agregar profesionales (staff)", content: "Ve a Staff → Agregar profesional. Completa nombre y email — el profesional recibirá una invitación para crear su acceso. Desde su perfil puedes asignarle los servicios que ofrece, definir su horario semanal y configurar sus comisiones." },
      { title: "Configurar horarios de atención", content: "En el perfil de cada profesional encuentras la sección Horario semanal. Marca los días que trabaja y el rango de horas. También puedes agregar excepciones (feriados, vacaciones) en Excepciones de disponibilidad." },
    ],
  },
  {
    category: "Cobros y pagos",
    icon: CreditCard,
    steps: [
      { title: "Activar cobros online a tus clientes", content: "Ve a Configuración → Cobros online. Necesitas una cuenta en Flow.cl. Ingresa tu API Key y Secret Key de producción (las encuentras en tu panel Flow → Integración) y activa el toggle. A partir de ese momento, tus clientes podrán pagar al reservar y el dinero llega directamente a tu cuenta." },
      { title: "Usar el POS para cobros en el local", content: "En el módulo Pagos del panel encuentras el POS. Selecciona el turno, elige el método (efectivo, tarjeta, transferencia) y confirma el pago. El historial queda registrado automáticamente." },
      { title: "Configurar comisiones del staff", content: "En el perfil de cada profesional puedes definir el tipo de comisión: porcentaje por servicio o monto fijo. El sistema calcula automáticamente cuánto le corresponde a cada uno al final del mes. Puedes liquidar con un clic desde el módulo Reportes → Comisiones." },
    ],
  },
  {
    category: "Clientes y comunicación",
    icon: Users,
    steps: [
      { title: "Gestionar tu base de clientes (CRM)", content: "En el módulo Clientes tienes el historial completo de cada persona: turnos pasados, pagos, notas y datos de contacto. Puedes buscar por nombre o email, agregar etiquetas y exportar la lista." },
      { title: "Recordatorios automáticos por email", content: "AgendaMok envía automáticamente un email de confirmación cuando el cliente reserva y un recordatorio 24 horas antes del turno. No requiere configuración adicional — funciona desde el momento en que activas tu cuenta." },
      { title: "Enviar campañas de email marketing", content: "En el módulo Marketing puedes crear campañas para enviar promociones, novedades o felicitaciones de cumpleaños a tu base de clientes. Configura el asunto, el mensaje y elige a quién enviarlo." },
    ],
  },
  {
    category: "Preguntas frecuentes",
    icon: HelpCircle,
    steps: [
      { title: "¿Puedo importar mis clientes desde otro sistema?", content: "Sí. En el módulo Clientes encuentras el botón «Importar». Puedes subir un archivo CSV o Excel con las columnas nombre, email y teléfono. El sistema detecta duplicados automáticamente." },
      { title: "¿Qué pasa cuando termina el período de prueba?", content: "Al vencer los 30 días gratis, si tienes una tarjeta registrada se cobra automáticamente el plan que seleccionaste ($9.900/mes para Starter). Si no tienes tarjeta, tu cuenta pasa a modo lectura — puedes ver tus datos pero no recibir nuevas reservas hasta que completes el pago." },
      { title: "¿Puedo cancelar en cualquier momento?", content: "Sí, sin penalidades. En Configuración → Plan y facturación encuentras el botón «Cancelar suscripción». Tu cuenta seguirá activa hasta el final del período pagado." },
    ],
  },
]

type FeatureValue = boolean | string

const comparisonRows: { feature: string; us: FeatureValue[]; them: FeatureValue[] }[] = [
  { feature: "Turnos ilimitados", us: [true, true, true], them: [true, true, true] },
  { feature: "Booking online 24/7", us: [true, true, true], them: [true, true, true] },
  { feature: "CRM de clientes", us: [true, true, true], them: [true, true, true] },
  { feature: "Recordatorios por email", us: [true, true, true], them: [true, true, true] },
  { feature: "Pagos online + POS", us: [true, true, true], them: ["$20.000/mes extra", "$20.000/mes extra", "$20.000/mes extra"] },
  { feature: "Reportes", us: ["Básico", "Completo", "Completo"], them: ["Básico", "Completo", "Completo"] },
  { feature: "Gift cards", us: [false, true, true], them: [false, false, true] },
  { feature: "Encuestas de satisfacción", us: [false, true, true], them: [false, false, true] },
  { feature: "Comisiones de staff", us: [false, true, true], them: [false, true, true] },
  { feature: "Presupuestos y cotizaciones", us: [false, true, true], them: [false, false, true] },
  { feature: "Ficha clínica personalizable", us: [false, false, true], them: [false, false, true] },
  { feature: "Boletas electrónicas (Bsale)", us: [false, true, true], them: [false, false, false] },
  { feature: "WhatsApp automático", us: ["Módulo extra $4.900/mes · 50 msgs/cliente", "Módulo extra $4.900/mes · 50 msgs/cliente", "Módulo extra $4.900/mes · 50 msgs/cliente"], them: ["$5.000/mes · 50 msgs/cliente", "$5.000/mes · 50 msgs/cliente", "$5.000/mes · 50 msgs/cliente"] },
  { feature: "Múltiples sedes", us: [false, false, true], them: [false, false, true] },
  { feature: "API access", us: [false, false, true], them: [false, false, true] },
]

const faqItems = [
  { q: "¿Necesito tarjeta de crédito para el período de prueba?", a: "No. Los 30 días gratis no requieren ningún método de pago. Solo te pedimos email y contraseña." },
  { q: "¿Puedo cancelar en cualquier momento?", a: "Sí, sin penalidades ni trámites. Cancela desde Configuración → Plan y tu cuenta sigue activa hasta el final del período pagado." },
  { q: "¿Cuánto tiempo toma configurar el sistema?", a: "La mayoría de los negocios están operativos en menos de 5 minutos: cuenta, servicios, staff y link de reservas listo." },
  { q: "¿Cobran comisión por cada reserva online?", a: "No. AgendaMok no cobra nada por reserva. Pagás solo el plan mensual, sin sorpresas." },
  { q: "¿Funciona para cualquier tipo de negocio con turnos?", a: "Sí. Peluquerías, clínicas, centros estéticos, gimnasios, estudios de tatuajes, psicólogos — cualquier negocio que trabaje con citas." },
]

function PricingToggle() {
  const [tab, setTab] = useState<"regular" | "sports">("regular")
  const NAVY = "#0d1b2a"
  const GOLD = "#C9A84C"

  useEffect(() => {
    const el = document.getElementById("regular-plans")
    if (el) el.style.display = tab === "sports" ? "none" : ""
  }, [tab])

  return (
    <div className="mb-12">
      {/* Tab switcher */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-full p-1 gap-1" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={() => setTab("regular")}
            className="px-6 py-2 rounded-full text-sm font-semibold transition-all"
            style={tab === "regular" ? { background: "#38bdf8", color: "#0d1b2a" } : { color: "rgba(255,255,255,0.5)" }}
          >
            AgendaMok
          </button>
          <button
            onClick={() => setTab("sports")}
            className="px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2"
            style={tab === "sports" ? { background: GOLD, color: NAVY } : { color: "rgba(255,255,255,0.5)" }}
          >
            <Trophy className="w-3.5 h-3.5" />
            AgendaMok Sports
          </button>
        </div>
      </div>

      {/* Sports plan — single card */}
      {tab === "sports" && (
        <div className="max-w-md mx-auto">
          <div className="relative rounded-2xl p-8 text-center" style={{ background: "linear-gradient(135deg,#0d1b2a,#0f2236)", border: `1px solid ${GOLD}40` }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-wide" style={{ background: GOLD, color: NAVY }}>
              Plan único
            </div>
            <div className="mb-6 mt-2">
              <p className="text-sm mb-1" style={{ color: GOLD }}>AgendaMok Sports</p>
              <h3 className="text-2xl font-bold text-white mb-1">Club Pro</h3>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>Todo lo que necesita tu club deportivo</p>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-bold text-white">$49.900</span>
                <span className="text-sm mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>/mes + IVA</span>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-left mb-8" style={{ color: "rgba(255,255,255,0.7)" }}>
              {[
                "Canchas ilimitadas con tarifas valle/punta",
                "Calendario de reservas con drag & drop",
                "Membresías y control de socios",
                "Feriados con recargo automático",
                "CRM de clientes",
                "Reportes de ocupación e ingresos",
                "Recordatorios automáticos por email",
                "Pagos online integrados con Flow",
                "Soporte prioritario",
              ].map(f => (
                <li key={f} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register?type=sports"
              className="block w-full py-3.5 rounded-full text-sm font-bold transition-all hover:opacity-90"
              style={{ background: GOLD, color: NAVY }}
            >
              Empezar 30 días gratis
            </Link>
            <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Sin tarjeta al inicio · Cancela cuando quieras</p>
          </div>
        </div>
      )}
    </div>
  )
}

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      {faqItems.map((item, i) => (
        <div key={i} className={`rounded-2xl border transition-colors overflow-hidden ${open === i ? "border-white/20 bg-white/[0.04]" : "border-white/8 bg-white/[0.02]"}`}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
          >
            <span className={`text-sm font-medium ${open === i ? "text-white" : "text-white/75"}`}>{item.q}</span>
            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-white/40 transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && (
            <div className="px-5 pb-4">
              <p className="text-sm text-white/50 leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function HelpAccordion() {
  const [openCat, setOpenCat] = useState<number | null>(0)
  const [openStep, setOpenStep] = useState<string | null>(null)

  const catColors = [
    { border: "border-sky-400/30", bg: "bg-sky-500/5", dot: "bg-sky-400", num: "bg-sky-500/20 text-sky-400" },
    { border: "border-violet-400/30", bg: "bg-violet-500/5", dot: "bg-violet-400", num: "bg-violet-500/20 text-violet-400" },
    { border: "border-emerald-400/30", bg: "bg-emerald-500/5", dot: "bg-emerald-400", num: "bg-emerald-500/20 text-emerald-400" },
    { border: "border-amber-400/30", bg: "bg-amber-500/5", dot: "bg-amber-400", num: "bg-amber-500/20 text-amber-400" },
    { border: "border-pink-400/30", bg: "bg-pink-500/5", dot: "bg-pink-400", num: "bg-pink-500/20 text-pink-400" },
  ]

  return (
    <div className="space-y-3">
      {helpItems.map((cat, ci) => {
        const c = catColors[ci % catColors.length]
        const isOpenCat = openCat === ci
        return (
          <div key={cat.category} className={`rounded-2xl border overflow-hidden transition-colors ${isOpenCat ? c.border : "border-white/10"}`}>
            <button
              onClick={() => { setOpenCat(isOpenCat ? null : ci); setOpenStep(null) }}
              className={`w-full flex items-center gap-3 px-5 py-4 transition-colors text-left ${isOpenCat ? c.bg : "bg-white/[0.03] hover:bg-white/[0.06]"}`}
            >
              <cat.icon className="w-4 h-4 text-white/50 flex-shrink-0" />
              <span className="flex-1 font-semibold text-white">{cat.category}</span>
              <span className={`w-2 h-2 rounded-full mr-1 ${isOpenCat ? c.dot : "bg-white/20"}`} />
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform flex-shrink-0 ${isOpenCat ? "rotate-180" : ""}`} />
            </button>

            {isOpenCat && (
              <div className="divide-y divide-white/5 bg-white/[0.015]">
                {cat.steps.map((step, si) => {
                  const key = `${ci}-${si}`
                  const isOpen = openStep === key
                  return (
                    <div key={step.title}>
                      <button
                        onClick={() => setOpenStep(isOpen ? null : key)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.04] transition-colors text-left"
                      >
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${c.num}`}>{si + 1}</span>
                        <span className={`flex-1 text-sm font-medium ${isOpen ? "text-white" : "text-white/75"}`}>{step.title}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isOpen ? `rotate-180 ${c.dot.replace("bg-","text-")}` : "text-white/30"}`} />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 pt-1">
                          <p className="text-sm text-white/60 leading-relaxed pl-8">{step.content}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CellValue({ val, isUs }: { val: FeatureValue; isUs: boolean }) {
  if (val === true) return <Check className={`w-4 h-4 ${isUs ? "text-sky-400" : "text-white/60"}`} />
  if (val === false) return <Minus className="w-4 h-4 text-white/30" />
  return <span className={`text-[10px] text-center leading-tight ${isUs ? "text-sky-300" : "text-red-400"}`}>{val}</span>
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setValue(Math.round(ease * target))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])
  return { value, ref }
}

function StatCard({ num, suffix, label, sub }: { num: number; suffix: string; label: string; sub: string }) {
  const { value, ref } = useCountUp(num, 1000)
  return (
    <div className="text-center">
      <div className="text-5xl sm:text-6xl font-bold tracking-tight mb-2 whitespace-nowrap gradient-text">
        <span ref={ref}>{value}</span>{suffix}
      </div>
      <div className="text-white font-medium mb-1">{label}</div>
      <div className="text-sm text-white/40">{sub}</div>
    </div>
  )
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal")
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed")
          }
        })
      },
      { threshold: 0.15 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

export default function LandingPage() {
  useScrollReveal()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-[#52525a] text-white">
      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }
        .reveal-delay-5 { transition-delay: 0.5s; }
        .reveal-delay-6 { transition-delay: 0.6s; }
        .gradient-text {
          background: linear-gradient(135deg, #fff 0%, #7dd3fc 50%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .card-glow:hover {
          box-shadow: 0 0 60px rgba(56,189,248,0.35), 0 0 20px rgba(255,255,255,0.05);
          border-color: rgba(56,189,248,0.6);
          background-color: rgba(255,255,255,0.08) !important;
        }
        @keyframes featureReveal {
          0%   { box-shadow: 0 0 0 1px rgba(56,189,248,0.9), 0 0 28px rgba(56,189,248,0.5); }
          60%  { box-shadow: 0 0 0 1px rgba(56,189,248,0.4), 0 0 12px rgba(56,189,248,0.2); }
          100% { box-shadow: none; }
        }
        .feature-card.revealed {
          animation: featureReveal 1.6s ease-out 0.2s both;
        }
        @keyframes zoomPulse {
          0%, 100% { transform: scale(1); letter-spacing: -0.02em; }
          50% { transform: scale(1.06); letter-spacing: 0.01em; }
        }
        .cta-zoom {
          animation: zoomPulse 3.5s ease-in-out infinite;
          display: inline-block;
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes ringPulse2 {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes heroWord {
          from { opacity: 0; transform: translateY(50px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes heroGrad {
          from { opacity: 0; transform: translateY(55px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .hero-word {
          display: inline-block;
          opacity: 0;
          animation: heroWord 1s cubic-bezier(0.16,1,0.3,1) both;
        }
        .hw0 { animation-delay: 0.1s; }
        .hw1 { animation-delay: 0.35s; }
        .hw2 { display: block; opacity: 0; animation: heroGrad 1s cubic-bezier(0.16,1,0.3,1) 0.6s both; }
        .hero-badge { opacity: 0; animation: heroWord 0.7s cubic-bezier(0.16,1,0.3,1) 0s both; }
        .hero-sub   { opacity: 0; animation: heroWord 0.8s cubic-bezier(0.16,1,0.3,1) 0.9s both; }
        .hero-ctas  { opacity: 0; animation: heroWord 0.8s cubic-bezier(0.16,1,0.3,1) 1.1s both; }
        .hero-note  { opacity: 0; animation: heroWord 0.6s cubic-bezier(0.16,1,0.3,1) 1.3s both; }
        .mockup-reveal {
          opacity: 0;
          transform: scale(0.92) translateY(32px) !important;
          transition: opacity 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s, transform 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s !important;
        }
        .mockup-reveal.revealed {
          opacity: 1 !important;
          transform: scale(1) translateY(0) !important;
        }
        .cta-btn-wrap {
          position: relative;
          display: inline-flex;
        }
        .cta-btn-wrap::before, .cta-btn-wrap::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          border: 2px solid rgba(56,189,248,0.6);
          animation: ringPulse 2s ease-out infinite;
        }
        .cta-btn-wrap::after {
          inset: -10px;
          border-color: rgba(56,189,248,0.3);
          animation: ringPulse2 2s ease-out infinite 0.4s;
        }
        .cta-btn {
          background: linear-gradient(135deg, #fff 0%, #e0f2fe 100%);
          transition: transform 0.25s, box-shadow 0.25s;
          box-shadow: 0 0 30px rgba(56,189,248,0.4), 0 4px 20px rgba(0,0,0,0.3);

        }
        .cta-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.4) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
          border-radius: 9999px;
        }
        .cta-btn:hover {
          transform: scale(1.08) translateY(-2px);
          box-shadow: 0 0 60px rgba(56,189,248,0.7), 0 8px 30px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Sports announcement banner */}
      <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 px-4 py-2 text-xs font-medium" style={{ background: "linear-gradient(90deg,#0d1b2a,#1a3352,#0d1b2a)" }}>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: "#C9A84C", color: "#0d1b2a" }}>NUEVO</span>
        <span className="text-white/90">AgendaMok Sports — Canchas, reservas y membresías para clubes deportivos</span>
        <Link href="#sports" className="hidden sm:inline-flex items-center gap-1 text-[#C9A84C] hover:underline">
          Ver más <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Nav */}
      <header className="fixed top-8 left-0 right-0 z-50 border-b border-white/8 backdrop-blur-xl" style={{ background: "rgba(40,40,44,0.88)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ boxShadow: "0 0 12px rgba(56,189,248,0.4)" }}>
              <img src="/mok-icon.png" alt="AgendaMok" width={28} height={28} className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-[17px] tracking-tight text-white">
              Agenda<span className="text-sky-400">Mok</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-white/55">
            <Link href="#features" className="hover:text-white transition-colors">Funciones</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Precios</Link>
            <Link href="#ayuda" className="hover:text-white transition-colors">Ayuda</Link>
            <Link href="/buscar" className="hover:text-white transition-colors">Buscar negocio</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden md:block text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5">
              Ingresar
            </Link>
            <Link href="/register" className="hidden md:block text-sm font-semibold bg-sky-500 hover:bg-sky-400 transition-all px-5 py-2 rounded-full" style={{ boxShadow: "0 0 16px rgba(56,189,248,0.35)" }}>
              Empezar gratis
            </Link>
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-white/70 hover:text-white hover:bg-white/8 transition-colors"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menú"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/8 px-4 py-4 flex flex-col gap-1" style={{ background: "rgba(36,36,40,0.98)" }}>
            {[
              { label: "Funciones", href: "#features" },
              { label: "Precios", href: "#pricing" },
              { label: "Ayuda", href: "#ayuda" },
              { label: "Buscar negocio", href: "/buscar" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} onClick={() => setMobileOpen(false)}
                className="px-3 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                {label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-white/8 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)}
                className="px-3 py-3 text-sm text-white/60 hover:text-white rounded-xl transition-colors text-center">
                Ingresar
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)}
                className="py-3 text-sm font-semibold bg-sky-500 hover:bg-sky-400 transition-all rounded-full text-center"
                style={{ boxShadow: "0 0 16px rgba(56,189,248,0.3)" }}>
                Empezar gratis
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-sky-500/10 blur-[120px]" />
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-sky-600/8 blur-[100px]" />
          </div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-36">
            <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-400/25 bg-sky-500/8 text-xs text-sky-300 mb-10 tracking-wide">
              <span className="text-sky-400">✦</span>
              30 días gratis · Sin tarjeta · Sin cobros sorpresa
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-8">
              <span className="text-white/90">
                <span className="hero-word hw0">El</span>{" "}
                <span className="hero-word hw1">verdadero</span>
              </span>
              <br />
              <span className="hero-word hw2 gradient-text">Copiloto de tu negocio.</span>
            </h1>

            <p className="hero-sub max-w-2xl mx-auto text-lg sm:text-xl text-white/50 mb-6 sm:mb-12 leading-relaxed">
              La plataforma de reservas online para peluquerías, clínicas, gimnasios y cualquier negocio con turnos.
              Configura en 5 minutos.
            </p>

            <div className="hero-ctas flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-sky-500 hover:bg-sky-400 transition-all rounded-full text-base font-semibold group">
                Empezar gratis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/buscar" className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all rounded-full text-base text-white/80">
                Buscar un negocio
              </Link>
            </div>

            <p className="hero-note mt-8 text-sm text-white/30">30 días gratis en todos los planes · Sin tarjeta al inicio</p>
          </div>
        </section>

        {/* Business carousel */}
        <BusinessCarousel />

        {/* AgendaMok Sports section */}
        <section id="sports" className="relative overflow-hidden py-24" style={{ background: "linear-gradient(135deg,#0d1b2a 0%,#0f2236 50%,#0d1b2a 100%)" }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: "rgba(201,168,76,0.08)" }} />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-6" style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C" }}>
                ✦ NUEVO
              </div>
              <h2 className="text-4xl sm:text-6xl font-bold mb-4">
                <span className="text-white">AgendaMok </span>
                <span style={{ color: "#C9A84C" }}>Sports</span>
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
                La plataforma completa para clubes deportivos. Gestiona canchas, reservas por hora y membresías desde un solo lugar.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
              {[
                { icon: Layers,      title: "Canchas y tarifas",       desc: "Configura tus canchas con tarifas valle y punta según día y horario. Precios automáticos sin cálculos manuales." },
                { icon: CalendarDays, title: "Calendario de reservas", desc: "Vista por cancha con drag & drop. Mueve reservas entre canchas y el precio se recalcula automáticamente." },
                { icon: Trophy,      title: "Membresías",               desc: "Planes mensuales, trimestrales o anuales. Control de vencimientos y acceso diferenciado por tipo de socio." },
                { icon: CalendarX2,  title: "Feriados con recargo",    desc: "Marca días feriados y define si cierras o abres con recargo porcentual o monto fijo. Se aplica solo." },
                { icon: UserCheck,   title: "CRM de socios",           desc: "Historial de reservas y pagos por socio. Segmentación y comunicación directa desde el panel." },
                { icon: TrendingUp,  title: "Reportes de ocupación",   desc: "Métricas de uso por cancha, ingresos por período y KPIs clave para tomar decisiones." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl p-6 transition-all hover:scale-[1.02]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(201,168,76,0.15)" }}>
                    <Icon className="w-5 h-5" style={{ color: "#C9A84C" }} />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-base transition-all hover:scale-105" style={{ background: "#C9A84C", color: "#0d1b2a" }}>
                Probar AgendaMok Sports gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>30 días gratis · Sin tarjeta</p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Dashboard preview */}
            <div className="mockup-reveal reveal mt-16 relative">
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#52525a] to-transparent z-10 pointer-events-none" />
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-sky-500/30 via-sky-400/10 to-sky-500/30 blur-2xl" />
              <img
                src="/dashboard-preview.png"
                alt="AgendaMok dashboard"
                className="relative w-full max-w-5xl mx-auto block drop-shadow-2xl"
              />
            </div>
          </div>
        </section>


        {/* Features */}
        {/* Stats */}
        <section className="py-24 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              <StatCard num={5}  suffix=" min" label="Para configurar" sub="Desde cero hasta tu primer turno" />
              <StatCard num={24} suffix="/7"  label="Disponible"      sub="Tus clientes reservan a cualquier hora" />
              <StatCard num={0}  suffix="%"   label="Comisión"        sub="Por reserva online. Sin letra chica." />
              <StatCard num={30} suffix=" días" label="Gratis"        sub="Sin tarjeta de crédito al inicio" />
            </div>
          </div>
        </section>

        <section id="features" className="py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20 reveal">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Todo lo que necesitas,<br />
                <span className="gradient-text">nada que no uses</span>
              </h2>
              <p className="text-white/50 text-lg max-w-xl mx-auto">Una plataforma completa diseñada para negocios de servicios.</p>
            </div>
            {/* All features — unified grid, equal-height cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {features.map((f, i) => {
                const accents = ["sky","violet","emerald","amber","pink","sky","violet","emerald","amber","pink","sky","violet"]
                const accent = accents[i % accents.length]
                const iconBg: Record<string,string> = { sky:"bg-sky-500/12", violet:"bg-violet-500/12", emerald:"bg-emerald-500/12", amber:"bg-amber-500/12", pink:"bg-pink-500/12" }
                const iconCol: Record<string,string> = { sky:"text-sky-400", violet:"text-violet-400", emerald:"text-emerald-400", amber:"text-amber-400", pink:"text-pink-400" }
                return (
                  <div key={f.title} className={`feature-card reveal reveal-delay-${(i % 3) + 1} card-glow group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] transition-all cursor-default flex flex-col h-full`}>
                    <div className={`w-10 h-10 rounded-xl ${iconBg[accent]} flex items-center justify-center mb-4 flex-shrink-0`}>
                      <f.icon className={`w-5 h-5 ${iconCol[accent]}`} />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-32 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="reveal mb-20">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Listo en <span className="gradient-text">3 pasos</span>
              </h2>
            </div>
            <div className="space-y-16">
              {[
                { num: "01", title: "Crea tu cuenta", desc: "Regístrate y configura tu negocio: nombre, servicios y equipo. Toma menos de 5 minutos.", color: "text-sky-400", dot: "bg-sky-400" },
                { num: "02", title: "Comparte tu link", desc: "Tus clientes acceden a tu página de reservas desde cualquier dispositivo y eligen horario.", color: "text-violet-400", dot: "bg-violet-400" },
                { num: "03", title: "Gestiona todo desde el panel", desc: "Calendario, clientes, pagos y reportes en un solo lugar. Sin planillas, sin papel.", color: "text-emerald-400", dot: "bg-emerald-400" },
              ].map((step, i) => (
                <div key={step.num} className={`reveal reveal-delay-${i + 1} flex flex-col sm:flex-row items-center sm:items-start gap-6 text-left`}>
                  <div className={`text-6xl font-bold ${step.color} flex-shrink-0 w-24 text-center`}>{step.num}</div>
                  <div className="pt-2">
                    <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${step.color} mb-2`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${step.dot}`} />Paso {i + 1}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-white/50 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-32 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 reveal">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Precios <span className="gradient-text">simples y claros</span>
              </h2>
              <p className="text-white/40 text-lg">30 días gratis en todos los planes · Sin tarjeta al inicio · Cancela cuando quieras.</p>
            </div>

            {/* Toggle AgendaMok / Sports */}
            <PricingToggle />

            {/* Plan cards — shown only when AgendaMok tab active (PricingToggle handles Sports) */}
            <div id="regular-plans" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-24">
              {plans.map((plan, i) => (
                <div
                  key={plan.name}
                  className={`reveal reveal-delay-${i + 1} card-glow relative rounded-2xl border p-6 flex flex-col transition-all ${
                    plan.highlight
                      ? "border-sky-400/50 bg-sky-500/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-sky-500 rounded-full text-xs font-semibold">
                      Más popular
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="font-semibold text-white text-lg mb-1">{plan.name}</h3>
                    <p className="text-sm text-white/55 mb-4">{plan.description}</p>
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-bold ${plan.highlight ? "text-sky-300" : "text-white"}`}>${plan.price}</span>
                      <span className="text-white/40 text-sm mb-1">/mes + IVA</span>
                    </div>
                  </div>
                  <ul className="space-y-3 flex-1 mb-6">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm text-white/70">
                        <Check className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-sky-400" : "text-emerald-400"}`} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`w-full text-center py-3 rounded-full text-sm font-semibold transition-all ${
                      plan.highlight
                        ? "bg-sky-500 hover:bg-sky-400 text-white"
                        : "border border-white/20 hover:border-white/40 hover:bg-white/5 text-white/80"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            {/* Comparison table — desktop only */}
            <div className="hidden md:block">
              <div className="text-center mb-10">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Todo incluido. <span className="gradient-text">Sin sorpresas.</span>
                </h3>
                <p className="text-white/40 max-w-xl mx-auto">Nuestra competencia cobra cada funcionalidad por separado. Nosotros no. Lo que ves es lo que pagas.</p>
              </div>

              <div className="rounded-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] bg-white/5 border-b border-white/10">
                  <div className="p-4" />
                  {/* AgendaMok headers */}
                  <div className="p-4 text-center border-l border-white/10">
                    <div className="text-xs text-sky-400 font-bold uppercase tracking-wider mb-1">AgendaMok</div>
                    <div className="text-xs text-white/50">Starter</div>
                    <div className="text-sm font-bold text-white">$9.900</div>
                  </div>
                  <div className="p-4 text-center border-l border-sky-400/30 bg-sky-500/5">
                    <div className="text-xs text-sky-400 font-bold uppercase tracking-wider mb-1">AgendaMok</div>
                    <div className="text-xs text-white/50">Negocio</div>
                    <div className="text-sm font-bold text-white">$24.900</div>
                  </div>
                  <div className="p-4 text-center border-l border-white/10">
                    <div className="text-xs text-sky-400 font-bold uppercase tracking-wider mb-1">AgendaMok</div>
                    <div className="text-xs text-white/50">Pro</div>
                    <div className="text-sm font-bold text-white">$39.900</div>
                  </div>
                  {/* Competitor headers */}
                  <div className="p-4 text-center border-l border-white/10 bg-white/[0.04]">
                    <div className="text-xs text-white/55 font-bold uppercase tracking-wider mb-1">Nuestra Competencia</div>
                    <div className="text-xs text-white/55">Individual</div>
                    <div className="text-sm font-bold text-white/70">$15.900</div>
                  </div>
                  <div className="p-4 text-center border-l border-white/10 bg-white/[0.04]">
                    <div className="text-xs text-white/55 font-bold uppercase tracking-wider mb-1">Nuestra Competencia</div>
                    <div className="text-xs text-white/55">Básico</div>
                    <div className="text-sm font-bold text-white/70">$34.900</div>
                  </div>
                  <div className="p-4 text-center border-l border-white/10 bg-white/[0.04]">
                    <div className="text-xs text-white/55 font-bold uppercase tracking-wider mb-1">Nuestra Competencia</div>
                    <div className="text-xs text-white/55">Premium</div>
                    <div className="text-sm font-bold text-white/70">$54.900</div>
                  </div>
                </div>

                {/* Rows */}
                {comparisonRows.map((row, ri) => (
                  <div
                    key={row.feature}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-white/5 last:border-0 ${ri % 2 === 0 ? "" : "bg-white/[0.015]"}`}
                  >
                    <div className="p-3 pl-4 text-sm text-white/60 flex items-center">{row.feature}</div>
                    {/* AgendaMok cols */}
                    {row.us.map((val, ci) => (
                      <div key={ci} className={`p-3 flex items-center justify-center border-l ${ci === 1 ? "border-sky-400/20 bg-sky-500/[0.03]" : "border-white/5"}`}>
                        <CellValue val={val} isUs />
                      </div>
                    ))}
                    {/* Competitor cols */}
                    {row.them.map((val, ci) => (
                      <div key={ci} className="p-3 flex items-center justify-center border-l border-white/10 bg-white/[0.04]">
                        <CellValue val={val} isUs={false} />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Footer row: prices */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] bg-white/5 border-t border-white/10">
                  <div className="p-4 text-sm font-semibold text-white/60">
                    Precio mensual + IVA
                    <div className="text-[10px] text-sky-400/70 font-normal mt-0.5">Sin costos ocultos</div>
                  </div>
                  <div className="p-4 text-center border-l border-white/10">
                    <span className="text-sky-400 font-bold">$9.900</span>
                  </div>
                  <div className="p-4 text-center border-l border-sky-400/30 bg-sky-500/5">
                    <span className="text-sky-400 font-bold">$24.900</span>
                  </div>
                  <div className="p-4 text-center border-l border-white/10">
                    <span className="text-sky-400 font-bold">$39.900</span>
                  </div>
                  <div className="p-4 text-center border-l border-white/10 bg-white/[0.04]">
                    <span className="text-white/70 font-bold">$15.900</span>
                    <div className="text-[10px] text-red-400 mt-0.5">cobros extra</div>
                  </div>
                  <div className="p-4 text-center border-l border-white/10 bg-white/[0.04]">
                    <span className="text-white/70 font-bold">$34.900</span>
                    <div className="text-[10px] text-red-400 mt-0.5">cobros extra</div>
                  </div>
                  <div className="p-4 text-center border-l border-white/10 bg-white/[0.04]">
                    <span className="text-white/70 font-bold">$54.900</span>
                    <div className="text-[10px] text-red-400 mt-0.5">cobros extra</div>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-white/20 mt-4">
                Precios de la competencia obtenidos de su sitio web oficial. Sujetos a cambio sin previo aviso.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Lo que dicen <span className="gradient-text">nuestros clientes</span>
              </h2>
              <p className="text-white/40 text-lg">Negocios reales que ya eliminaron el caos de las reservas.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  name: "Valentina Torres",
                  role: "Dueña · Estudio Valentina, Santiago",
                  avatar: "VT",
                  color: "from-pink-500 to-rose-500",
                  text: "Antes coordinaba todo por WhatsApp y se me escapaban turnos constantemente. Ahora mis clientes reservan solos y yo solo abro el calendario por la mañana. Un cambio brutal.",
                  stars: 5,
                },
                {
                  name: "Diego Ramos",
                  role: "Director · Clínica Ramos, Concepción",
                  avatar: "DR",
                  color: "from-sky-500 to-blue-500",
                  text: "Manejo 4 profesionales y 2 sedes. Con AgendaMok pasé de tener una planilla de Excel imposible a tenerlo todo en un panel. La ficha clínica fue la razón principal por la que me cambié.",
                  stars: 5,
                },
                {
                  name: "Javiera Muñoz",
                  role: "Fundadora · FitZone Pilates, Viña del Mar",
                  avatar: "JM",
                  color: "from-violet-500 to-purple-500",
                  text: "El recordatorio automático por email redujo los no-shows casi a cero. Y el hecho de que los pagos online estén incluidos sin pagar extra fue el punto de quiebre con el servicio anterior.",
                  stars: 5,
                },
              ].map((t, i) => (
                <div key={t.name} className={`card-glow p-6 rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col gap-4`}>
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{t.name}</div>
                      <div className="text-xs text-white/30">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* Help / Instructivos */}
        <section id="ayuda" className="py-32 border-t border-white/5">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 reveal">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Preguntas <span className="gradient-text">frecuentes</span>
              </h2>
              <p className="text-white/40 text-lg">Las dudas más comunes antes de empezar.</p>
            </div>
            <FaqAccordion />
            <div className="mt-10 text-center">
              <Link href="/ayuda" className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors">
                Ver el centro de ayuda completo
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-32 border-t border-white/5 relative overflow-hidden">
          {/* Glow de fondo animado */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[700px] h-[700px] rounded-full bg-sky-500/15 blur-[120px] animate-pulse" />
            <div className="absolute w-[400px] h-[400px] rounded-full bg-sky-400/10 blur-[80px]" style={{animation: "ringPulse 4s ease-in-out infinite"}} />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div>
              <h2 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-tight">
                Empieza hoy.<br />
                <span className="gradient-text">Es gratis.</span>
              </h2>
              <p className="text-white/40 text-lg mb-10">
                Configura tu negocio en minutos y empieza a recibir reservas online.
              </p>
              <div className="cta-btn-wrap">
                <Link href="/register" className="cta-btn inline-flex items-center gap-2 px-12 py-5 text-black rounded-full text-lg font-bold group relative overflow-hidden">
                  <span className="relative z-10 flex items-center gap-2">
                    Crear cuenta gratis
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-white/30">
          <p>© 2026 AgendaMok. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="/privacidad" className="hover:text-white/60 transition-colors">Privacidad</Link>
            <Link href="/terminos" className="hover:text-white/60 transition-colors">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
