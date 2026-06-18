"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Check, X, Minus, Calendar, Users, CreditCard, Bell, BarChart3, Globe, ArrowRight, Star, Percent, MapPin, FileText, Stethoscope, Key } from "lucide-react"

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
      "Inventario",
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
      "Presupuestos y cotizaciones",
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
  { feature: "Ficha clínica personalizable", us: [false, false, true], them: [false, false, true] },
  { feature: "WhatsApp automático", us: ["Módulo extra $4.900/mes · 50 msgs/cliente", "Módulo extra $4.900/mes · 50 msgs/cliente", "Módulo extra $4.900/mes · 50 msgs/cliente"], them: ["$5.000/mes · 50 msgs/cliente", "$5.000/mes · 50 msgs/cliente", "$5.000/mes · 50 msgs/cliente"] },
  { feature: "Múltiples sedes", us: [false, false, true], them: [false, false, true] },
  { feature: "API access", us: [false, false, true], them: [false, false, true] },
]

function CellValue({ val, isUs }: { val: FeatureValue; isUs: boolean }) {
  if (val === true) return <Check className={`w-4 h-4 ${isUs ? "text-sky-400" : "text-white/60"}`} />
  if (val === false) return <Minus className="w-4 h-4 text-white/30" />
  return <span className={`text-[10px] text-center leading-tight ${isUs ? "text-sky-300" : "text-red-400"}`}>{val}</span>
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
          animation: floatUp 3s ease-in-out infinite;
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

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#5a5a62]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-white tracking-tight">
            Agenda<span className="text-sky-400">Mok</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <Link href="#features" className="hover:text-white transition-colors">Funciones</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Precios</Link>
            <Link href="/buscar" className="hover:text-white transition-colors">Buscar negocio</Link>
            <Link href="/login" className="hover:text-white transition-colors">Ingresar</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5">
              Ingresar
            </Link>
            <Link href="/register" className="text-sm font-medium bg-sky-500 hover:bg-sky-400 transition-colors px-4 py-2 rounded-full">
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-sky-500/10 blur-[120px]" />
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-sky-600/8 blur-[100px]" />
          </div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Nuevo: Recordatorios automáticos por email
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-8">
              <span className="text-white/90">El verdadero</span>
              <br />
              <span className="gradient-text">Copiloto de tu negocio.</span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/50 mb-12 leading-relaxed">
              La plataforma de reservas online para peluquerías, clínicas, gimnasios y cualquier negocio con turnos.
              Configura en 5 minutos.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-sky-500 hover:bg-sky-400 transition-all rounded-full text-base font-semibold group">
                Empezar gratis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/buscar" className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all rounded-full text-base text-white/80">
                Buscar un negocio
              </Link>
            </div>

            <p className="mt-8 text-sm text-white/30">30 días gratis en todos los planes · Sin tarjeta al inicio</p>

            {/* Dashboard preview */}
            <div className="mt-20 relative">
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#3a3a3c] to-transparent z-10" />
              {/* Retroiluminación */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-sky-500/40 via-sky-400/20 to-sky-500/40 blur-xl" />
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-sky-400/20 via-white/5 to-sky-400/20" />
              <div className="relative rounded-2xl border border-white/20 bg-[#2c2c2e] overflow-hidden shadow-2xl shadow-sky-900/40">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#242426]">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <div className="flex-1 mx-4 h-5 rounded-md bg-white/5 text-xs text-white/30 flex items-center justify-center">agendamok.cl/dashboard</div>
                </div>
                <div className="grid grid-cols-4 gap-px bg-white/5 p-px">
                  <div className="bg-[#242426] col-span-1 p-4 space-y-2">
                    {["Inicio","Turnos","Clientes","Staff","Servicios","Reportes"].map(item => (
                      <div key={item} className={`text-xs px-3 py-2 rounded-lg ${item === "Turnos" ? "bg-sky-500/40 text-sky-300 font-medium" : "text-white/30 hover:text-white/50"}`}>{item}</div>
                    ))}
                  </div>
                  <div className="bg-[#2c2c2e] col-span-3 p-4">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: "Turnos hoy", val: "12", sub: "+3 vs ayer", color: "text-sky-400" },
                        { label: "Este mes", val: "$284K", sub: "+18% ↑", color: "text-green-400" },
                        { label: "Clientes", val: "48", sub: "4 nuevos", color: "text-purple-400" },
                      ].map(({ label, val, sub, color }) => (
                        <div key={label} className="bg-white/[0.06] rounded-xl p-3 border border-white/5">
                          <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wide">{label}</div>
                          <div className={`text-2xl font-bold ${color} mb-0.5`}>{val}</div>
                          <div className="text-[10px] text-white/30">{sub}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3 space-y-2.5 border border-white/5">
                      <div className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Próximos turnos</div>
                      {[
                        ["10:00","María González","Corte + color","#6366f1"],
                        ["11:30","Carlos Reyes","Barba","#10b981"],
                        ["13:00","Ana Torres","Manicure","#ec4899"],
                      ].map(([time, name, service, color]) => (
                        <div key={name} className="flex items-center gap-3 text-xs py-1">
                          <span className="text-white/30 w-10 font-mono">{time}</span>
                          <div className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm" style={{background: color, boxShadow: `0 0 6px ${color}`}} />
                          <span className="text-white/80 flex-1 font-medium">{name}</span>
                          <span className="text-white/30 text-[10px] px-2 py-0.5 rounded-full bg-white/5">{service}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-24 border-y border-white/5">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              ["5 min", "para configurar tu negocio"],
              ["24/7", "reservas sin intervención"],
              ["−40%", "reducción de ausencias"],
              ["100%", "de tus datos, siempre"],
            ].map(([num, label], i) => (
              <div key={label} className={`reveal reveal-delay-${i + 1}`}>
                <div className="text-4xl font-bold gradient-text mb-2">{num}</div>
                <div className="text-sm text-white/40">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20 reveal">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Todo lo que necesitas,<br />
                <span className="gradient-text">nada que no uses</span>
              </h2>
              <p className="text-white/40 text-lg max-w-xl mx-auto">Una plataforma completa diseñada para negocios de servicios.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`reveal reveal-delay-${(i % 3) + 1} card-glow group p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-default`}
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center mb-4 group-hover:bg-sky-500/30 transition-colors">
                    <f.icon className="w-5 h-5 text-sky-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              ))}
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
                { num: "01", title: "Crea tu cuenta", desc: "Regístrate y configura tu negocio: nombre, servicios y equipo. Toma menos de 5 minutos." },
                { num: "02", title: "Comparte tu link", desc: "Tus clientes acceden a tu página de reservas desde cualquier dispositivo y eligen horario." },
                { num: "03", title: "Gestiona todo desde el panel", desc: "Calendario, clientes, pagos y reportes en un solo lugar. Sin planillas, sin papel." },
              ].map((step, i) => (
                <div key={step.num} className={`reveal reveal-delay-${i + 1} flex flex-col sm:flex-row items-center sm:items-start gap-6 text-left`}>
                  <div className="text-6xl font-bold text-white/40 flex-shrink-0 w-24 text-center">{step.num}</div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-white/40 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-32 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20 reveal">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Precios <span className="gradient-text">simples y claros</span>
              </h2>
              <p className="text-white/40 text-lg">30 días gratis en todos los planes · Sin tarjeta al inicio · Cancela cuando quieras.</p>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-24">
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
                    <p className="text-sm text-white/40 mb-4">{plan.description}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-white/40 text-sm mb-1">/mes + IVA</span>
                    </div>
                  </div>
                  <ul className="space-y-3 flex-1 mb-6">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm text-white/60">
                        <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
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

            {/* Comparison table */}
            <div>
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
                    <div className="text-[10px] text-red-400 mt-0.5">+ add-ons</div>
                  </div>
                  <div className="p-4 text-center border-l border-white/10 bg-white/[0.04]">
                    <span className="text-white/70 font-bold">$34.900</span>
                    <div className="text-[10px] text-red-400 mt-0.5">+ add-ons</div>
                  </div>
                  <div className="p-4 text-center border-l border-white/10 bg-white/[0.04]">
                    <span className="text-white/70 font-bold">$54.900</span>
                    <div className="text-[10px] text-red-400 mt-0.5">+ add-ons</div>
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

            {/* Social proof bar */}
            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
              {[
                ["+1.200", "negocios activos"],
                ["4.9 / 5", "calificación promedio"],
                ["98%", "renuevan cada año"],
              ].map(([num, label]) => (
                <div key={label}>
                  <div className="text-3xl font-bold gradient-text mb-1">{num}</div>
                  <div className="text-sm text-white/40">{label}</div>
                </div>
              ))}
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
              <h2 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-tight cta-zoom">
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
          <p>© 2025 AgendaMok. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacidad</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
