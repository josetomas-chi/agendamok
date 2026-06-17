import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || "noreply@agendapro.com"

function base(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:32px 16px}
    .card{background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:32px;border:1px solid #e5e7eb}
    .logo{font-weight:800;font-size:20px;color:#6366f1;margin-bottom:24px}
    h1{font-size:22px;font-weight:700;margin:0 0 8px}
    p{color:#6b7280;font-size:15px;line-height:1.6;margin:8px 0}
    .box{background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;font-size:14px}
    .row:last-child{border-bottom:none}
    .label{color:#9ca3af}
    .btn{display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-top:16px}
    .footer{text-align:center;color:#9ca3af;font-size:12px;margin-top:24px}
  </style></head><body><div class="card">
    <div class="logo">Agenda Pro</div>
    ${content}
    <div class="footer">Agenda Pro · Sistema de reservas online</div>
  </div></body></html>`
}

export async function sendBookingConfirmation({
  clientName, clientEmail, businessName,
  serviceName, staffName, date, time, duration,
}: {
  clientName: string; clientEmail: string; businessName: string
  serviceName: string; staffName: string; date: string; time: string; duration: number
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Turno confirmado — ${businessName}`,
    html: base(`
      <h1>¡Turno confirmado!</h1>
      <p>Hola <strong>${clientName}</strong>, tu reserva en <strong>${businessName}</strong> está confirmada.</p>
      <div class="box">
        <div class="row"><span class="label">Servicio</span><span>${serviceName}</span></div>
        <div class="row"><span class="label">Profesional</span><span>${staffName}</span></div>
        <div class="row"><span class="label">Fecha</span><span>${date}</span></div>
        <div class="row"><span class="label">Hora</span><span>${time}hs</span></div>
        <div class="row"><span class="label">Duración</span><span>${duration} min</span></div>
      </div>
      <p>Si necesitas cancelar o reprogramar, comunícate directamente con el negocio.</p>
    `),
  })
}

export async function sendInvite({
  ownerName, ownerEmail, businessName, inviteUrl,
}: {
  ownerName: string; ownerEmail: string; businessName: string; inviteUrl: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Te invitamos a gestionar ${businessName} en Agenda Pro`,
    html: base(`
      <h1>Bienvenido a Agenda Pro</h1>
      <p>Hola <strong>${ownerName}</strong>, tu negocio <strong>${businessName}</strong> ya está creado en Agenda Pro.</p>
      <p>Haz clic en el botón para crear tu contraseña y acceder a tu panel:</p>
      <a href="${inviteUrl}" class="btn">Activar mi cuenta</a>
      <p style="margin-top:16px;font-size:13px;color:#9ca3af">Este link expira en 7 días.</p>
    `),
  })
}

export async function sendBookingReminder({
  clientName, clientEmail, businessName,
  serviceName, date, time,
}: {
  clientName: string; clientEmail: string; businessName: string
  serviceName: string; date: string; time: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Recordatorio: tu turno mañana en ${businessName}`,
    html: base(`
      <h1>Tu turno es mañana</h1>
      <p>Hola <strong>${clientName}</strong>, te recordamos que mañana tienes un turno en <strong>${businessName}</strong>.</p>
      <div class="box">
        <div class="row"><span class="label">Servicio</span><span>${serviceName}</span></div>
        <div class="row"><span class="label">Fecha</span><span>${date}</span></div>
        <div class="row"><span class="label">Hora</span><span>${time}hs</span></div>
      </div>
      <p>¡Te esperamos!</p>
    `),
  })
}
