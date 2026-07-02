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

  console.log("[email] sendBookingConfirmation → from:", FROM, "to:", clientEmail)
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
      <hr class="divider"/>
      <p style="color:rgba(255,255,255,0.3);font-size:13px;margin:0 0 6px">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"}/mis-turnos?email=${encodeURIComponent(clientEmail)}" style="color:rgba(56,189,248,0.7);text-decoration:none">Ver todos mis turnos</a>
        ${cancelUrl ? ` &nbsp;·&nbsp; <a href="${cancelUrl}" class="btn-cancel">Cancelar este turno</a>` : ""}
      </p>
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

export async function sendClientOtp({
  email, code,
}: {
  email: string; code: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Tu código de acceso: ${code}`,
    html: base(`
      <h1>Tu código de acceso</h1>
      <p class="subtitle">Usa este código para acceder a tu historial de turnos en AgendaMok.</p>
      <div style="text-align:center;margin:32px 0">
        <div style="display:inline-block;background:rgba(14,165,233,0.1);border:1.5px solid rgba(14,165,233,0.3);border-radius:16px;padding:20px 40px">
          <span style="font-size:40px;font-weight:800;letter-spacing:0.15em;color:#38bdf8;font-variant-numeric:tabular-nums">${code}</span>
        </div>
      </div>
      <p class="subtitle" style="font-size:13px">El código expira en <strong style="color:#fff">10 minutos</strong>. Si no solicitaste este acceso, ignora este mensaje.</p>
    `),
  })
}

export async function sendNewBookingAlert({
  ownerEmail, ownerName, businessName,
  clientName, clientEmail, clientPhone,
  serviceName, staffName, date, time,
}: {
  ownerEmail: string; ownerName: string; businessName: string
  clientName: string; clientEmail: string; clientPhone?: string
  serviceName: string; staffName: string; date: string; time: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Nueva reserva — ${clientName} · ${serviceName}`,
    html: base(`
      <h1>Nueva reserva recibida 🎉</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${ownerName}</strong>, <strong style="color:#38bdf8">${clientName}</strong> acaba de reservar en <strong style="color:#fff">${businessName}</strong>.</p>
      <div class="box">
        <div class="row"><span class="label">Cliente</span><span class="value">${clientName}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${clientEmail}</span></div>
        ${clientPhone ? `<div class="row"><span class="label">Teléfono</span><span class="value">${clientPhone}</span></div>` : ""}
        <div class="row"><span class="label">Servicio</span><span class="value">${serviceName}</span></div>
        <div class="row"><span class="label">Profesional</span><span class="value">${staffName}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${date}</span></div>
        <div class="row"><span class="label">Hora</span><span class="value">${time} hrs</span></div>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"}/dashboard/appointments" class="btn">Ver en el dashboard →</a>
    `),
  })
}

export async function sendCancellationAlert({
  ownerEmail, ownerName, businessName,
  clientName, serviceName, date, time,
}: {
  ownerEmail: string; ownerName: string; businessName: string
  clientName: string; serviceName: string; date: string; time: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Turno cancelado — ${clientName} · ${serviceName}`,
    html: base(`
      <h1>Turno cancelado ❌</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${ownerName}</strong>, <strong style="color:#38bdf8">${clientName}</strong> canceló su turno en <strong style="color:#fff">${businessName}</strong>.</p>
      <div class="box">
        <div class="row"><span class="label">Cliente</span><span class="value">${clientName}</span></div>
        <div class="row"><span class="label">Servicio</span><span class="value">${serviceName}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${date}</span></div>
        <div class="row"><span class="label">Hora</span><span class="value">${time} hrs</span></div>
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:13px;margin-top:12px">El horario quedó disponible para nuevas reservas.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"}/dashboard/appointments" class="btn" style="margin-top:8px">Ver agenda →</a>
    `),
  })
}

export async function sendDailySummary({
  ownerEmail, ownerName, businessName, date, appointments,
}: {
  ownerEmail: string; ownerName: string; businessName: string; date: string
  appointments: { time: string; clientName: string; serviceName: string; staffName: string }[]
}) {
  if (!process.env.RESEND_API_KEY) return

  const rows = appointments.map(a =>
    `<div class="row"><span class="label">${a.time}</span><span class="value">${a.clientName} · ${a.serviceName}<br/><span style="color:rgba(255,255,255,0.3);font-size:12px">${a.staffName}</span></span></div>`
  ).join("")

  await resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `${appointments.length} turno${appointments.length !== 1 ? "s" : ""} para hoy — ${businessName}`,
    html: base(`
      <h1>Tu agenda de hoy 📋</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${ownerName}</strong>, esto es lo que tienes para hoy en <strong style="color:#38bdf8">${businessName}</strong>:</p>
      <div class="box">
        ${appointments.length ? rows : '<p style="color:rgba(255,255,255,0.3);text-align:center;font-size:14px;padding:8px 0">Sin turnos agendados para hoy</p>'}
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"}/dashboard" class="btn">Abrir dashboard →</a>
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

export async function sendInvoiceEmail({
  clientEmail, clientName, businessName, invoiceNumber, pdfUrl,
}: {
  clientEmail: string; clientName: string; businessName: string
  invoiceNumber: number; pdfUrl: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Tu boleta N° ${invoiceNumber} de ${businessName}`,
    html: base(`
      <h1>Tu boleta electrónica</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, te enviamos la boleta de tu servicio en <strong style="color:#38bdf8">${businessName}</strong>.</p>
      <div class="box">
        <div class="row"><span class="label">N° Boleta</span><span class="value">${invoiceNumber}</span></div>
        <div class="row"><span class="label">Emitida por</span><span class="value">${businessName}</span></div>
      </div>
      <div style="text-align:center;margin-top:28px">
        <a href="${pdfUrl}" style="display:inline-block;background:#38bdf8;color:#0f172a;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px">
          Descargar boleta PDF
        </a>
      </div>
      <p class="subtitle" style="margin-top:20px;font-size:12px">Documento emitido electrónicamente ante el SII a través de Bsale.</p>
    `),
  })
}
