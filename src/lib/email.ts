import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || "noreply@agendapro.com"

function base(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body{margin:0;padding:0;background:#1a1a1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .wrap{max-width:560px;margin:0 auto;padding:32px 16px}
    .header{text-align:center;padding:28px 0 20px}
    .logo-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:linear-gradient(135deg,#0ea5e9,#38bdf8);border-radius:10px;vertical-align:middle;margin-right:8px}
    .logo-text{font-size:22px;font-weight:800;color:#ffffff;vertical-align:middle}
    .logo-mok{color:#38bdf8}
    .card{background:#28282c;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden}
    .accent-bar{height:3px;background:linear-gradient(90deg,#0ea5e9,#38bdf8,#7dd3fc)}
    .body{padding:32px}
    h1{color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px}
    .subtitle{color:rgba(255,255,255,0.5);font-size:15px;line-height:1.6;margin:0 0 24px}
    .box{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin:20px 0}
    .row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px}
    .row:last-child{border-bottom:none}
    .label{color:rgba(255,255,255,0.35);font-size:13px}
    .value{color:#ffffff;font-weight:500;text-align:right}
    .btn{display:inline-block;background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#ffffff !important;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-top:8px;letter-spacing:0.01em}
    .btn-cancel{color:rgba(255,255,255,0.35) !important;font-size:13px;text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.15)}
    .divider{border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0}
    .footer{text-align:center;padding:20px 0 8px;color:rgba(255,255,255,0.2);font-size:12px;line-height:1.8}
    .footer a{color:rgba(56,189,248,0.6);text-decoration:none}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <span class="logo-text">Agenda<span class="logo-mok">Mok</span></span>
    </div>
    <div class="card">
      <div class="accent-bar"></div>
      <div class="body">
        ${content}
      </div>
    </div>
    <div class="footer">
      AgendaMok · Sistema de reservas online<br/>
      <a href="https://agendamok.cl">agendamok.cl</a>
    </div>
  </div>
</body>
</html>`
}

export async function sendBookingConfirmation({
  clientName, clientEmail, businessName,
  serviceName, staffName, date, time, duration, cancelUrl,
}: {
  clientName: string; clientEmail: string; businessName: string
  serviceName: string; staffName: string; date: string; time: string; duration: number
  cancelUrl?: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Turno confirmado — ${businessName}`,
    html: base(`
      <h1>¡Turno confirmado! ✓</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, tu reserva en <strong style="color:#38bdf8">${businessName}</strong> está confirmada.</p>
      <div class="box">
        <div class="row"><span class="label">Servicio</span><span class="value">${serviceName}</span></div>
        <div class="row"><span class="label">Profesional</span><span class="value">${staffName}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${date}</span></div>
        <div class="row"><span class="label">Hora</span><span class="value">${time} hrs</span></div>
        <div class="row"><span class="label">Duración</span><span class="value">${duration} min</span></div>
      </div>
      ${cancelUrl ? `<hr class="divider"/><p style="color:rgba(255,255,255,0.3);font-size:13px;margin:0">¿No puedes asistir? <a href="${cancelUrl}" class="btn-cancel">Cancelar mi turno</a></p>` : ""}
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
    subject: `Te invitamos a gestionar ${businessName} en AgendaMok`,
    html: base(`
      <h1>Bienvenido a AgendaMok</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${ownerName}</strong>, tu negocio <strong style="color:#38bdf8">${businessName}</strong> ya está listo en AgendaMok.</p>
      <p class="subtitle">Haz clic en el botón para crear tu contraseña y acceder a tu panel de administración:</p>
      <a href="${inviteUrl}" class="btn">Activar mi cuenta →</a>
      <p style="margin-top:20px;font-size:12px;color:rgba(255,255,255,0.25)">Este link expira en 7 días.</p>
    `),
  })
}

export async function sendSurveyRequest({
  clientName, clientEmail, businessName, surveyUrl,
}: {
  clientName: string; clientEmail: string; businessName: string; surveyUrl: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `¿Cómo fue tu experiencia en ${businessName}?`,
    html: base(`
      <h1>¿Cómo fue tu visita?</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, gracias por visitarnos en <strong style="color:#38bdf8">${businessName}</strong>.</p>
      <p class="subtitle">Tu opinión nos ayuda a mejorar. Solo toma 30 segundos:</p>
      <a href="${surveyUrl}" class="btn">Dejar mi opinión →</a>
      <p style="margin-top:20px;font-size:12px;color:rgba(255,255,255,0.25)">Este link expira en 7 días.</p>
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
      <h1>Tu turno es mañana 📅</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, te recordamos que mañana tienes un turno en <strong style="color:#38bdf8">${businessName}</strong>.</p>
      <div class="box">
        <div class="row"><span class="label">Servicio</span><span class="value">${serviceName}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${date}</span></div>
        <div class="row"><span class="label">Hora</span><span class="value">${time} hrs</span></div>
      </div>
      <p class="subtitle" style="margin-top:16px">¡Te esperamos!</p>
    `),
  })
}
