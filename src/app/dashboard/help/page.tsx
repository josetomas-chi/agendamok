"use client"

import { useState } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"

const helpItems = [
  {
    category: "Primeros pasos",
    icon: "🚀",
    steps: [
      { title: "Crear tu cuenta", content: "Ingresa a agendamok.cl y haz clic en «Empezar gratis». Completa tu email y contraseña — no necesitas tarjeta de crédito. En menos de 1 minuto tienes acceso al panel." },
      { title: "Configurar los datos de tu negocio", content: "En el panel, ve a Configuración → Negocio. Allí completas el nombre, dirección, teléfono y categoría. También puedes subir tu logo y escribir una descripción que verán tus clientes al reservar." },
      { title: "Configurar tu página de reservas pública", content: "En Configuración → Página de reservas encuentras tu link único (ej: agendamok.cl/book/mi-negocio). Puedes personalizar el mensaje de bienvenida y el horario de atención general. Comparte ese link en Instagram, WhatsApp o Google." },
    ],
  },
  {
    category: "Servicios y profesionales",
    icon: "✂️",
    steps: [
      { title: "Agregar tus servicios", content: "En el menú lateral ve a Servicios → Nuevo servicio. Completa el nombre (ej: «Corte de cabello»), duración en minutos, precio y color identificador. Puedes crear todos los que necesites y agruparlos por categorías." },
      { title: "Agregar profesionales (staff)", content: "Ve a Staff → Agregar profesional. Completa nombre y email — el profesional recibirá una invitación para crear su acceso. Desde su perfil puedes asignarle los servicios que ofrece, definir su horario semanal y configurar sus comisiones." },
      { title: "Configurar horarios de atención", content: "En el perfil de cada profesional encuentras la sección Horario semanal. Marca los días que trabaja y el rango de horas. También puedes agregar excepciones (feriados, vacaciones) en Excepciones de disponibilidad." },
    ],
  },
  {
    category: "Cobros y pagos",
    icon: "💳",
    steps: [
      { title: "Activar cobros online a tus clientes", content: "Ve a Configuración → Cobros online. Necesitas una cuenta en Flow.cl. Ingresa tu API Key y Secret Key de producción (las encuentras en tu panel Flow → Integración) y activa el toggle. A partir de ese momento, tus clientes podrán pagar al reservar y el dinero llega directamente a tu cuenta." },
      { title: "Usar el POS para cobros en el local", content: "En el módulo Pagos del panel encuentras el POS. Selecciona el turno, elige el método (efectivo, tarjeta, transferencia) y confirma el pago. El historial queda registrado automáticamente." },
      { title: "Configurar comisiones del staff", content: "En el perfil de cada profesional puedes definir el tipo de comisión: porcentaje por servicio o monto fijo. El sistema calcula automáticamente cuánto le corresponde a cada uno al final del mes. Puedes liquidar con un clic desde el módulo Reportes → Comisiones." },
    ],
  },
  {
    category: "Clientes y comunicación",
    icon: "👥",
    steps: [
      { title: "Gestionar tu base de clientes (CRM)", content: "En el módulo Clientes tienes el historial completo de cada persona: turnos pasados, pagos, notas y datos de contacto. Puedes buscar por nombre o email, agregar etiquetas y exportar la lista." },
      { title: "Recordatorios automáticos por email", content: "AgendaMok envía automáticamente un email de confirmación cuando el cliente reserva y un recordatorio 24 horas antes del turno. No requiere configuración adicional — funciona desde el momento en que activas tu cuenta." },
      { title: "Enviar campañas de email marketing", content: "En el módulo Marketing puedes crear campañas para enviar promociones, novedades o felicitaciones de cumpleaños a tu base de clientes. Configura el asunto, el mensaje y elige a quién enviarlo." },
    ],
  },
  {
    category: "Calendario y turnos",
    icon: "📅",
    steps: [
      { title: "Crear un turno manual desde el panel", content: "En el módulo Turnos, haz clic en cualquier celda vacía del calendario o en el botón «+ Nuevo turno». Selecciona el servicio, el profesional, la fecha, hora y el cliente. El turno aparece de inmediato en el calendario." },
      { title: "Mover un turno en el calendario", content: "En la vista de calendario puedes arrastrar cualquier turno a un nuevo horario. Al soltarlo, el cambio se guarda automáticamente y el cliente recibe una notificación por email." },
      { title: "Ver los datos de contacto de un cliente desde el calendario", content: "Haz clic sobre cualquier turno en el calendario para ver el nombre del cliente, su teléfono, email y el servicio agendado. Si el cliente dejó su teléfono, puedes llamarle con un solo toque." },
    ],
  },
  {
    category: "Reportes y métricas",
    icon: "📊",
    steps: [
      { title: "Ver los ingresos del mes", content: "En el módulo Reportes encuentras el resumen de ingresos del mes actual, los servicios más vendidos, la ocupación por profesional y la tasa de ausencias. Todos los datos se actualizan en tiempo real." },
      { title: "Revisar comisiones del equipo", content: "En Reportes → Comisiones ves cuánto le corresponde a cada profesional según los turnos completados. Puedes marcar las comisiones como liquidadas y llevar el historial de pagos." },
      { title: "Exportar datos de clientes", content: "En el módulo Clientes, usa el botón «Exportar» para descargar tu base de clientes en formato CSV. Útil para respaldos o para importar en otras herramientas." },
    ],
  },
  {
    category: "Preguntas frecuentes",
    icon: "❓",
    steps: [
      { title: "¿Puedo importar mis clientes desde otro sistema?", content: "Sí. En el módulo Clientes encuentras el botón «Importar». Puedes subir un archivo CSV o Excel con las columnas nombre, email y teléfono. El sistema detecta duplicados automáticamente." },
      { title: "¿Qué pasa cuando termina el período de prueba?", content: "Al vencer los 30 días gratis, si tienes una tarjeta registrada se cobra automáticamente el plan que seleccionaste ($9.900/mes para Starter). Si no tienes tarjeta, tu cuenta pasa a modo lectura — puedes ver tus datos pero no recibir nuevas reservas hasta que completes el pago." },
      { title: "¿Puedo cancelar en cualquier momento?", content: "Sí, sin penalidades. En Configuración → Plan y facturación encuentras el botón «Cancelar suscripción». Tu cuenta seguirá activa hasta el final del período pagado." },
      { title: "¿Mis clientes necesitan crear una cuenta para reservar?", content: "No. Tus clientes reservan desde tu página pública sin registrarse. Solo necesitan ingresar su nombre, email y teléfono. Si reservan varias veces, el sistema los reconoce automáticamente por su email." },
    ],
  },
]

const catColors = [
  { border: "border-sky-400/30", bg: "bg-sky-500/5", dot: "bg-sky-400", numCls: "bg-sky-500/20 text-sky-400", iconCol: "text-sky-400" },
  { border: "border-violet-400/30", bg: "bg-violet-500/5", dot: "bg-violet-400", numCls: "bg-violet-500/20 text-violet-400", iconCol: "text-violet-400" },
  { border: "border-emerald-400/30", bg: "bg-emerald-500/5", dot: "bg-emerald-400", numCls: "bg-emerald-500/20 text-emerald-400", iconCol: "text-emerald-400" },
  { border: "border-amber-400/30", bg: "bg-amber-500/5", dot: "bg-amber-400", numCls: "bg-amber-500/20 text-amber-400", iconCol: "text-amber-400" },
  { border: "border-pink-400/30", bg: "bg-pink-500/5", dot: "bg-pink-400", numCls: "bg-pink-500/20 text-pink-400", iconCol: "text-pink-400" },
  { border: "border-cyan-400/30", bg: "bg-cyan-500/5", dot: "bg-cyan-400", numCls: "bg-cyan-500/20 text-cyan-400", iconCol: "text-cyan-400" },
  { border: "border-rose-400/30", bg: "bg-rose-500/5", dot: "bg-rose-400", numCls: "bg-rose-500/20 text-rose-400", iconCol: "text-rose-400" },
]

export default function HelpPage() {
  const [openCat, setOpenCat] = useState<number | null>(0)
  const [openStep, setOpenStep] = useState<string | null>(null)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Centro de ayuda</h1>
          <p className="text-sm text-white/40">Guías y respuestas para sacar el máximo provecho de AgendaMok</p>
        </div>
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {helpItems.map((cat, ci) => {
          const c = catColors[ci % catColors.length]
          const isOpenCat = openCat === ci
          return (
            <div key={cat.category} className={`rounded-2xl border overflow-hidden transition-colors ${isOpenCat ? c.border : "border-white/10"}`}>
              <button
                onClick={() => { setOpenCat(isOpenCat ? null : ci); setOpenStep(null) }}
                className={`w-full flex items-center gap-3 px-5 py-4 transition-colors text-left ${isOpenCat ? c.bg : "bg-[#2c2c30] hover:bg-white/[0.06]"}`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="flex-1 font-semibold text-white">{cat.category}</span>
                <span className={`text-xs font-medium ${isOpenCat ? c.iconCol : "text-white/30"}`}>
                  {cat.steps.length} {cat.steps.length === 1 ? "guía" : "guías"}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform flex-shrink-0 ml-1 ${isOpenCat ? "rotate-180" : ""}`} />
              </button>

              {isOpenCat && (
                <div className="divide-y divide-white/5 bg-[#242426]">
                  {cat.steps.map((step, si) => {
                    const key = `${ci}-${si}`
                    const isOpen = openStep === key
                    return (
                      <div key={step.title}>
                        <button
                          onClick={() => setOpenStep(isOpen ? null : key)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.04] transition-colors text-left"
                        >
                          <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${c.numCls}`}>{si + 1}</span>
                          <span className={`flex-1 text-sm font-medium ${isOpen ? "text-white" : "text-white/75"}`}>{step.title}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isOpen ? `rotate-180 ${c.iconCol}` : "text-white/30"}`} />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 pt-1 bg-white/[0.02]">
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

      {/* Contact footer */}
      <div className="rounded-2xl border border-white/10 bg-[#2c2c30] p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">¿No encontraste lo que buscabas?</p>
          <p className="text-xs text-white/40 mt-0.5">Escríbenos y te ayudamos a resolver cualquier duda.</p>
        </div>
        <a
          href="mailto:soporte@agendamok.cl"
          className="flex-shrink-0 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors text-sm font-semibold text-white"
        >
          Contactar soporte
        </a>
      </div>
    </div>
  )
}
