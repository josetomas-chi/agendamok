"use client"

import { useState } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"

const helpItems = [
  {
    category: "Primeros pasos",
    icon: "🚀",
    steps: [
      { title: "Crear tu cuenta", content: "Ingresa a agendamok.cl y haz clic en «Empezar gratis». Completa tu email y contraseña — no necesitas tarjeta de crédito. En menos de 1 minuto tienes acceso al panel." },
      { title: "Configurar los datos de tu negocio", content: "Ve a Configuración → Negocio. Completa el nombre, dirección, teléfono y categoría. También puedes subir tu logo y escribir una descripción que verán tus clientes al reservar online." },
      { title: "Agregar tus servicios", content: "Ve a Servicios y haz clic en «+ Nuevo servicio». Completa el nombre, duración en minutos, precio y color identificador. Puedes editar un servicio haciendo clic directamente sobre su tarjeta. La capacidad máxima de participantes también es configurable por servicio." },
      { title: "Agregar profesionales (staff)", content: "Ve a Staff → Agregar profesional. El profesional recibirá una invitación por email. Desde su perfil asignas los servicios que ofrece, defines su horario semanal y configuras sus comisiones (porcentaje o monto fijo)." },
      { title: "Configurar tu página pública de reservas", content: "En Configuración → Página de reservas encuentras tu link único (ej: agendamok.cl/book/mi-negocio). Comparte ese link en Instagram, WhatsApp o Google. Tus clientes podrán elegir servicio, profesional, fecha y hora sin necesidad de crear cuenta." },
    ],
  },
  {
    category: "Calendario y turnos",
    icon: "📅",
    steps: [
      { title: "Crear un turno desde el panel", content: "En Turnos, haz clic en cualquier celda vacía del calendario o en «+ Nuevo turno». Selecciona servicio, profesional, fecha, hora y cliente. Puedes buscar el cliente escribiendo su nombre en el campo — si tiene historial aparece en la lista." },
      { title: "Mover un turno con drag & drop", content: "En la vista de calendario arrastra cualquier turno a un nuevo horario. Al soltarlo el cambio se guarda y el cliente recibe automáticamente un email de reagendamiento con opción de agregar el nuevo horario a Google Calendar." },
      { title: "Ver detalle y gestionar un turno", content: "Haz clic sobre cualquier turno para ver el detalle: cliente, servicio, hora, notas y estado. Desde ahí puedes cambiar el estado (Confirmado, Completado, Cancelado, No presentó), modificar el profesional asignado o registrar el pago." },
      { title: "Notificación cuando cambia el profesional", content: "Si modificas el profesional asignado a un turno, el cliente recibe automáticamente un email informando el cambio con el nombre del nuevo profesional." },
      { title: "Excepciones de disponibilidad del staff", content: "En el perfil de cada profesional puedes agregar excepciones: días bloqueados (feriados, vacaciones) o cambios de capacidad para días específicos. Las excepciones impiden que se tomen turnos en esos horarios." },
    ],
  },
  {
    category: "Clientes y fidelización",
    icon: "👥",
    steps: [
      { title: "Gestionar tu base de clientes (CRM)", content: "En el módulo Clientes tienes el historial completo de cada persona: turnos pasados, pagos, notas, etiquetas y segmento. Puedes filtrar por segmento y buscar por nombre, email o teléfono." },
      { title: "Segmentos de clientes", content: "Cada cliente tiene un segmento asignable: VIP, Influencer, Frecuente, Regular, Nuevo o En riesgo. El segmento se puede cambiar manualmente desde el detalle del cliente. El sistema asciende a VIP automáticamente cuando el cliente acumula los puntos configurados en Settings → Fidelización." },
      { title: "Cliente Influencer", content: "El segmento Influencer es para clientes especiales que no pagan. Configura un 100% de descuento para este segmento en Settings → Fidelización y el POS aplicará el descuento automáticamente." },
      { title: "Puntos de fidelización", content: "Cada vez que un turno se marca como Completado, el cliente suma los puntos configurados en Settings → Fidelización. Puedes ajustar los puntos manualmente desde el detalle del cliente. Al llegar al umbral VIP el segmento se actualiza solo." },
      { title: "Descuentos automáticos por segmento", content: "En Settings → Fidelización configuras el porcentaje de descuento para cada segmento (VIP, Influencer, etc.). Al abrir el cobro POS de un turno, si el cliente tiene descuento, el monto se calcula automáticamente y se muestra en verde." },
    ],
  },
  {
    category: "Cobros y pagos",
    icon: "💳",
    steps: [
      { title: "Usar el POS para cobros en el local", content: "En el módulo Pagos encontrarás la lista de turnos pendientes de cobro. Al hacer clic en «Cobrar», el sistema muestra el monto del servicio. Si el cliente tiene descuento por segmento, se aplica automáticamente. Elige el método (efectivo, tarjeta, transferencia) y confirma." },
      { title: "Activar cobros online con Flow", content: "Ve a Configuración → Cobros online. Ingresa tu API Key y Secret Key de producción de Flow.cl. Tus clientes podrán pagar al reservar desde la página pública — el dinero llega directo a tu cuenta Flow." },
      { title: "Emitir boletas electrónicas (Bsale)", content: "En Configuración → Facturación ingresa tu API Key de Bsale. Una vez configurado, después de registrar un cobro en el POS aparece el botón «Emitir boleta». También puedes emitirla desde el detalle del turno. Los pagos online con Flow la emiten automáticamente." },
      { title: "Presupuestos (cotizaciones)", content: "En el módulo Cotizaciones puedes crear presupuestos con múltiples ítems, descuento global y fecha de vencimiento. Desde la vista de detalle puedes enviarlos por email al cliente con un clic, y cambiar su estado: Borrador → Enviado → Aceptado / Rechazado. Si una cotización aceptada se cae, usa «Volver a borrador» para revertirla." },
      { title: "Configurar comisiones del staff", content: "En el perfil de cada profesional defines el tipo de comisión: porcentaje del pago o monto fijo por turno. El sistema calcula automáticamente lo que corresponde al completar cada turno. Revisa el resumen en Reportes → Comisiones." },
    ],
  },
  {
    category: "Comunicación automática",
    icon: "✉️",
    steps: [
      { title: "Confirmación de reserva", content: "Cuando se crea un turno (manual o desde la página pública), el cliente recibe automáticamente un email de confirmación con el servicio, profesional, fecha y hora." },
      { title: "Recordatorio antes del turno", content: "El sistema envía un recordatorio por email 24 horas antes del turno. No requiere configuración — funciona desde el primer día." },
      { title: "Email de reagendamiento", content: "Al mover un turno (drag & drop o modificación manual), el cliente recibe un email con el nuevo horario y un botón para agregarlo a Google Calendar. El email incluye un aviso para eliminar el evento anterior del calendario si ya lo tenía agendado." },
      { title: "Email de cancelación", content: "Cuando un turno se cancela, el cliente recibe un email de notificación con un link para reservar nuevamente." },
      { title: "Encuesta de satisfacción", content: "Al marcar un turno como Completado, el cliente recibe automáticamente una encuesta de satisfacción. Las respuestas quedan registradas en el sistema." },
      { title: "Campañas de marketing", content: "En el módulo Marketing creas campañas de email para enviar a tu base de clientes: promociones, novedades o reactivación de clientes inactivos. Elige los destinatarios y programa el envío." },
    ],
  },
  {
    category: "Reportes y métricas",
    icon: "📊",
    steps: [
      { title: "Ver los ingresos del período", content: "En el módulo Reportes selecciona el rango de fechas y ves el resumen de ingresos, cantidad de turnos, tasa de ocupación y servicios más vendidos. Los datos reflejan únicamente turnos con estado Completado." },
      { title: "Gráfico de ingresos por período", content: "El módulo Reportes muestra un gráfico de barras con la evolución de ingresos. Puedes comparar semanas o meses para identificar tendencias." },
      { title: "Comisiones del equipo", content: "En Reportes → Comisiones ves el detalle de lo que corresponde a cada profesional según los turnos completados y sus tasas configuradas. Puedes marcarlas como liquidadas." },
      { title: "Exportar datos", content: "Usa el botón «Exportar CSV» en Reportes para descargar el resumen de ingresos y turnos. En Clientes también puedes exportar tu base completa." },
    ],
  },
  {
    category: "Configuración avanzada",
    icon: "⚙️",
    steps: [
      { title: "Fidelización — puntos y descuentos", content: "En Configuración → Fidelización defines cuántos puntos suma cada turno completado, el umbral de puntos para ascender a VIP automáticamente, y el porcentaje de descuento que corresponde a cada segmento (VIP, Influencer, Frecuente, etc.)." },
      { title: "Integración con Google Calendar", content: "Ve a Configuración → Integraciones y conecta tu Google Calendar. Los turnos nuevos se agregan automáticamente a tu calendario de negocio. Los clientes reciben en sus emails un botón para agregar el turno a su propio Google Calendar." },
      { title: "Portal del cliente", content: "Cada cliente puede acceder a su historial de turnos a través del link que recibe por email. Desde ahí puede ver sus próximos turnos, reprogramarlos con drag & drop y cancelarlos si es necesario." },
      { title: "Locaciones", content: "Si tu negocio opera en múltiples sedes, en Configuración → Locaciones defines cada una. Al crear un turno puedes asociarlo a una locación específica." },
      { title: "Personalizar la página pública", content: "En Configuración → Página de reservas ajustas el mensaje de bienvenida, activas o desactivas el pago online, y defines si se muestra al profesional en el proceso de reserva." },
    ],
  },
  {
    category: "Preguntas frecuentes",
    icon: "❓",
    steps: [
      { title: "¿Mis clientes necesitan crear cuenta para reservar?", content: "No. Reservan desde tu página pública ingresando solo nombre, email y teléfono. El sistema los reconoce automáticamente en visitas siguientes por su email." },
      { title: "¿Puedo tener varios profesionales trabajando al mismo tiempo?", content: "Sí. Cada profesional tiene su propia agenda. En la vista de calendario puedes filtrar por profesional o ver todos al mismo tiempo en modo multi-columna." },
      { title: "¿Qué pasa si muevo un turno en el calendario?", content: "Al arrastrar un turno a un nuevo horario, el sistema valida disponibilidad y envía automáticamente un email al cliente con el nuevo horario. El cambio es instantáneo." },
      { title: "¿Cómo revierto una cotización aceptada?", content: "Desde la vista de detalle de la cotización, cuando el estado es Aceptado, Rechazado o Vencido, aparece el botón «Volver a borrador» que te permite reeditarla." },
      { title: "¿Puedo cancelar la suscripción en cualquier momento?", content: "Sí, sin penalidades. En Configuración → Plan y facturación encuentras el botón «Cancelar suscripción». Tu cuenta seguirá activa hasta el final del período ya pagado." },
      { title: "¿Cómo funciona el descuento automático en el cobro?", content: "Al abrir el POS para un turno, el sistema lee el segmento del cliente y aplica el descuento configurado en Settings → Fidelización. El monto descontado se muestra en verde antes de confirmar el cobro." },
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
