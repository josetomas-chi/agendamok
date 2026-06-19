import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = { title: "Política de Privacidad — AgendaMok" }

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen" style={{ background: "#28282c", color: "#e5e5e7" }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidad</h1>
        <p className="text-white/40 text-sm mb-10">Última actualización: junio 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Quiénes somos</h2>
            <p>AgendaMok es una plataforma de gestión de turnos y reservas en línea operada desde Chile. Nos comprometemos a proteger la privacidad de los usuarios de conformidad con la <strong className="text-white/90">Ley 19.628 sobre Protección de la Vida Privada</strong> y sus modificaciones vigentes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Datos que recopilamos</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-white/90">Datos de negocios:</strong> nombre, correo electrónico, teléfono e información del establecimiento.</li>
              <li><strong className="text-white/90">Datos de clientes finales:</strong> nombre, correo electrónico y teléfono, ingresados al momento de realizar una reserva.</li>
              <li><strong className="text-white/90">Datos de uso:</strong> registros de acceso, navegación dentro de la plataforma y preferencias de configuración.</li>
              <li><strong className="text-white/90">Datos de pago:</strong> procesados íntegramente por pasarelas de pago certificadas (Flow). AgendaMok no almacena datos de tarjetas de crédito o débito.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Uso de los datos</h2>
            <p>Utilizamos los datos recopilados para:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Operar y mejorar la plataforma.</li>
              <li>Enviar confirmaciones y recordatorios de reservas.</li>
              <li>Gestionar el cobro de suscripciones.</li>
              <li>Atender solicitudes de soporte.</li>
              <li>Cumplir obligaciones legales.</li>
            </ul>
            <p className="mt-3">No vendemos ni cedemos datos personales a terceros con fines comerciales.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Almacenamiento y seguridad</h2>
            <p>Los datos se almacenan en servidores seguros con cifrado en tránsito (TLS) y en reposo. Aplicamos medidas técnicas y organizativas razonables para prevenir accesos no autorizados, pérdida o alteración de la información.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Derechos del titular</h2>
            <p>Conforme a la Ley 19.628, tienes derecho a:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Acceder a tus datos personales almacenados.</li>
              <li>Rectificar datos inexactos o desactualizados.</li>
              <li>Solicitar la eliminación de tus datos (derecho al olvido).</li>
              <li>Oponerte al tratamiento de tus datos en ciertos casos.</li>
            </ul>
            <p className="mt-3">Para ejercer estos derechos, escríbenos a <a href="mailto:privacidad@agendamok.cl" className="text-sky-400 hover:underline">privacidad@agendamok.cl</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Cookies</h2>
            <p>Utilizamos cookies estrictamente necesarias para el funcionamiento de la sesión. No usamos cookies de seguimiento publicitario ni compartimos datos de navegación con redes de anuncios.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Cambios a esta política</h2>
            <p>Podemos actualizar esta política ocasionalmente. Notificaremos cambios significativos por correo electrónico o mediante un aviso destacado en la plataforma. El uso continuado del servicio tras la notificación implica aceptación de los cambios.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Contacto</h2>
            <p>Si tienes preguntas sobre esta política, contáctanos en <a href="mailto:privacidad@agendamok.cl" className="text-sky-400 hover:underline">privacidad@agendamok.cl</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm text-white/30">
          <Link href="/terminos" className="hover:text-white/60 transition-colors">Términos de uso</Link>
          <Link href="/" className="hover:text-white/60 transition-colors">Inicio</Link>
        </div>
      </div>
    </div>
  )
}
