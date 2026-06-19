import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = { title: "Términos de Uso — AgendaMok" }

export default function TerminosPage() {
  return (
    <div className="min-h-screen" style={{ background: "#28282c", color: "#e5e5e7" }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Términos de Uso</h1>
        <p className="text-white/40 text-sm mb-10">Última actualización: junio 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Aceptación</h2>
            <p>Al registrarte y utilizar AgendaMok aceptas estos Términos de Uso en su totalidad. Si no estás de acuerdo con alguna disposición, no debes usar el servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Descripción del servicio</h2>
            <p>AgendaMok es una plataforma SaaS que permite a negocios de servicios gestionar turnos, personal, clientes y pagos. El servicio se presta a través de Internet y requiere una suscripción activa para acceder a todas sus funcionalidades.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Cuenta y responsabilidades</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Eres responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
              <li>Debes proporcionar información veraz y actualizada al registrarte.</li>
              <li>No puedes ceder, vender ni transferir tu cuenta a terceros.</li>
              <li>Eres responsable de todo el contenido y las acciones realizadas desde tu cuenta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Planes y pagos</h2>
            <p>AgendaMok opera bajo un modelo de suscripción mensual o anual. Los precios se muestran en el sitio web y no incluyen IVA, el que se agregará según corresponda a la legislación tributaria vigente. El pago se procesa a través de Flow u otras pasarelas autorizadas.</p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Los cargos son recurrentes hasta que canceles tu suscripción.</li>
              <li>No realizamos reembolsos por períodos ya facturados, salvo fallas atribuibles a AgendaMok.</li>
              <li>Si un pago falla, el acceso puede suspenderse hasta regularizar la deuda.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Período de prueba</h2>
            <p>Ofrecemos un período de prueba gratuito de 30 días sin necesidad de ingresar datos de pago. Al finalizar el período de prueba, deberás suscribirte a un plan de pago para continuar usando el servicio.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Uso aceptable</h2>
            <p>Está prohibido usar AgendaMok para:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Actividades ilícitas o contrarias a la legislación chilena.</li>
              <li>Enviar comunicaciones no solicitadas (spam).</li>
              <li>Intentar vulnerar la seguridad de la plataforma.</li>
              <li>Revender o redistribuir el servicio sin autorización.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Propiedad intelectual</h2>
            <p>Todos los derechos sobre la plataforma, su diseño, código y contenido son propiedad de AgendaMok. El uso del servicio no otorga ningún derecho de propiedad intelectual sobre los mismos. Los datos de tu negocio y clientes son de tu propiedad.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Disponibilidad y soporte</h2>
            <p>Nos esforzamos por mantener el servicio disponible las 24 horas, pero no garantizamos disponibilidad ininterrumpida. Realizamos mantenimientos programados con aviso previo. El soporte se presta por correo electrónico en días hábiles.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Limitación de responsabilidad</h2>
            <p>AgendaMok no será responsable por pérdidas de negocio, datos o ingresos derivados de interrupciones del servicio, salvo negligencia grave comprobada. La responsabilidad total de AgendaMok no excederá el monto pagado por el usuario en los últimos 3 meses.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Cancelación y eliminación de datos</h2>
            <p>Puedes cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta. Tras la cancelación, tus datos se conservarán por 30 días, período durante el cual podrás solicitar su exportación. Transcurrido ese plazo, serán eliminados definitivamente.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Modificaciones</h2>
            <p>AgendaMok puede modificar estos términos con al menos 15 días de aviso previo por correo electrónico. El uso continuado del servicio tras ese plazo implica aceptación de los nuevos términos.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Ley aplicable</h2>
            <p>Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá a los tribunales ordinarios de justicia de Santiago de Chile.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Contacto</h2>
            <p>Para consultas sobre estos términos: <a href="mailto:legal@agendamok.cl" className="text-sky-400 hover:underline">legal@agendamok.cl</a></p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm text-white/30">
          <Link href="/privacidad" className="hover:text-white/60 transition-colors">Política de privacidad</Link>
          <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
        </div>
      </div>
    </div>
  )
}
