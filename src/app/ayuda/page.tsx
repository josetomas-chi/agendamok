"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronDown, Calendar, Rocket, Scissors, CreditCard, Users, HelpCircle, ArrowLeft, type LucideIcon } from "lucide-react"
import { MokIcon } from "@/components/ui/mok-icon"

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

const catColors = [
  { border: "border-sky-400/30", bg: "bg-sky-500/5", dot: "bg-sky-400", num: "bg-sky-500/20 text-sky-400" },
  { border: "border-violet-400/30", bg: "bg-violet-500/5", dot: "bg-violet-400", num: "bg-violet-500/20 text-violet-400" },
  { border: "border-emerald-400/30", bg: "bg-emerald-500/5", dot: "bg-emerald-400", num: "bg-emerald-500/20 text-emerald-400" },
  { border: "border-amber-400/30", bg: "bg-amber-500/5", dot: "bg-amber-400", num: "bg-amber-500/20 text-amber-400" },
  { border: "border-pink-400/30", bg: "bg-pink-500/5", dot: "bg-pink-400", num: "bg-pink-500/20 text-pink-400" },
]

export default function AyudaPage() {
  const [openCat, setOpenCat] = useState<number | null>(0)
  const [openStep, setOpenStep] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#52525a] text-white">
      {/* Nav */}
      <header className="border-b border-white/8 backdrop-blur-xl sticky top-0 z-50" style={{ background: "rgba(40,40,44,0.88)" }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
          <div className="w-px h-4 bg-white/15" />
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
              <img src="/icon.svg" alt="AgendaMok" width={24} height={24} className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-[15px] tracking-tight">Agenda<span className="text-sky-400">Mok</span></span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-20">
        <div className="mb-14">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            Centro de <span style={{ background: "linear-gradient(135deg, #fff 0%, #7dd3fc 50%, #38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>ayuda</span>
          </h1>
          <p className="text-white/40 text-lg">Todo lo que necesitás saber para configurar y aprovechar AgendaMok.</p>
        </div>

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
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isOpen ? "rotate-180 text-sky-400" : "text-white/30"}`} />
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

        <div className="mt-16 text-center">
          <p className="text-white/40 text-sm mb-4">¿No encontrás lo que buscás?</p>
          <Link href="mailto:hola@agendamok.cl" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/15 hover:border-white/30 hover:bg-white/5 transition-all text-sm text-white/70 hover:text-white">
            Contactar soporte
          </Link>
        </div>
      </main>
    </div>
  )
}
