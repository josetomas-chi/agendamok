import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ? `AgendaMok <${process.env.RESEND_FROM_EMAIL}>` : "AgendaMok <noreply@agendamok.cl>"

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
    .row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;gap:24px}
    .label{color:rgba(255,255,255,0.35);font-size:13px;white-space:nowrap;min-width:90px}
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
      <span class="logo-text"><span class="logo-mok">Agenda</span><span class="logo-mok">Mok</span></span>
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
  serviceName, staffName, date, time, duration, cancelUrl, startTimeISO,
}: {
  clientName: string; clientEmail: string; businessName: string
  serviceName: string; staffName: string; date: string; time: string; duration: number
  cancelUrl?: string; startTimeISO?: string
}) {
  if (!process.env.RESEND_API_KEY) return

  // Build Google Calendar URL
  let gcalUrl = ""
  if (startTimeISO) {
    const start = new Date(startTimeISO)
    const end = new Date(start.getTime() + duration * 60000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${serviceName} — ${businessName}`,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: `Profesional: ${staffName}`,
    })
    gcalUrl = `https://calendar.google.com/calendar/render?${params.toString()}`
  }

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
      ${gcalUrl ? `
      <div style="text-align:center;margin:24px 0 8px">
        <a href="${gcalUrl}" style="display:inline-block;background:#38bdf8;color:#0c1a2e;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.01em">
          📅 Agregar a Google Calendar
        </a>
      </div>` : ""}
      <hr class="divider"/>
      <p style="color:rgba(255,255,255,0.3);font-size:13px;margin:0 0 6px">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.cl"}/mis-turnos?email=${encodeURIComponent(clientEmail)}" style="color:rgba(56,189,248,0.7);text-decoration:none">Ver todos mis turnos</a>
        ${cancelUrl ? ` &nbsp;·&nbsp; <a href="${cancelUrl}" class="btn-cancel">Cancelar este turno</a>` : ""}
      </p>
    `),
  })
}

export async function sendCancellationEmail({
  clientName, clientEmail, businessName, serviceName, staffName, date, time, bookingUrl,
}: {
  clientName: string; clientEmail: string; businessName: string
  serviceName: string; staffName: string; date: string; time: string; bookingUrl?: string
}) {
  if (!process.env.RESEND_API_KEY) return
  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Turno cancelado — ${businessName}`,
    html: base(`
      <h1>Turno cancelado</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, tu turno en <strong style="color:#38bdf8">${businessName}</strong> ha sido cancelado.</p>
      <div class="box">
        <div class="row"><span class="label">Servicio</span><span class="value">${serviceName}</span></div>
        <div class="row"><span class="label">Profesional</span><span class="value">${staffName}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${date}</span></div>
        <div class="row"><span class="label">Hora</span><span class="value">${time} hrs</span></div>
      </div>
      ${bookingUrl ? `
      <div style="text-align:center;margin:24px 0 8px">
        <a href="${bookingUrl}" style="display:inline-block;background:#38bdf8;color:#0c1a2e;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.01em">
          Reagendar turno →
        </a>
      </div>` : ""}
    `),
  })
}

export async function sendRescheduleEmail({
  clientName, clientEmail, businessName, serviceName, staffName, date, time, startTimeISO, duration,
}: {
  clientName: string; clientEmail: string; businessName: string
  serviceName: string; staffName: string; date: string; time: string
  startTimeISO?: string; duration: number
}) {
  if (!process.env.RESEND_API_KEY) return

  let gcalUrl = ""
  if (startTimeISO) {
    const start = new Date(startTimeISO)
    const end = new Date(start.getTime() + duration * 60000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${serviceName} — ${businessName}`,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: `Profesional: ${staffName}`,
    })
    gcalUrl = `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Turno reprogramado — ${businessName}`,
    html: base(`
      <h1>Turno reprogramado ✓</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, tu turno en <strong style="color:#38bdf8">${businessName}</strong> ha sido reagendado.</p>
      <div class="box">
        <div class="row"><span class="label">Servicio</span><span class="value">${serviceName}</span></div>
        <div class="row"><span class="label">Profesional</span><span class="value">${staffName}</span></div>
        <div class="row"><span class="label">Nueva fecha</span><span class="value">${date}</span></div>
        <div class="row"><span class="label">Nueva hora</span><span class="value">${time} hrs</span></div>
      </div>
      ${gcalUrl ? `
      <div style="text-align:center;margin:24px 0 4px">
        <a href="${gcalUrl}" style="display:inline-block;background:#38bdf8;color:#0c1a2e;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.01em">
          📅 Agregar a Google Calendar
        </a>
      </div>
      <p style="text-align:center;color:rgba(255,255,255,0.3);font-size:12px;margin:8px 0 0">Si ya tenías este turno en tu calendario, elimínalo antes de agregar el nuevo.</p>` : ""}
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

export async function sendStaffChangeEmail({
  clientName, clientEmail, businessName, serviceName, newStaffName, date, time,
}: {
  clientName: string; clientEmail: string; businessName: string
  serviceName: string; newStaffName: string; date: string; time: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Cambio de profesional — ${businessName}`,
    html: base(`
      <h1>Cambio de profesional</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, te informamos que el profesional asignado a tu turno en <strong style="color:#38bdf8">${businessName}</strong> ha cambiado.</p>
      <div class="box">
        <div class="row"><span class="label">Servicio</span><span class="value">${serviceName}</span></div>
        <div class="row"><span class="label">Nuevo profesional</span><span class="value" style="color:#38bdf8;font-weight:700">${newStaffName}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${date}</span></div>
        <div class="row"><span class="label">Hora</span><span class="value">${time} hrs</span></div>
      </div>
      <p class="subtitle" style="margin-top:16px;font-size:13px">El horario de tu turno se mantiene igual. Si tienes alguna consulta, contáctanos.</p>
    `),
  })
}

export async function sendQuoteEmail({
  clientEmail, clientName, businessName, quoteNumber, validUntil, items, discount, notes,
}: {
  clientEmail: string; clientName: string; businessName: string
  quoteNumber: number; validUntil?: string | null
  items: { description: string; quantity: number; unitPrice: number }[]
  discount: number; notes?: string | null
}) {
  if (!process.env.RESEND_API_KEY) return

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const discountAmt = subtotal * discount / 100
  const total = subtotal - discountAmt
  const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`

  const rows = items.map(i => `
    <div class="row">
      <span class="label" style="flex:1">${i.description}</span>
      <span class="value" style="min-width:40px;text-align:center">${i.quantity}</span>
      <span class="value" style="min-width:90px">${fmt(i.unitPrice)}</span>
      <span class="value" style="min-width:90px">${fmt(i.quantity * i.unitPrice)}</span>
    </div>`).join("")

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Presupuesto #${String(quoteNumber).padStart(4, "0")} de ${businessName}`,
    html: base(`
      <h1>Tu presupuesto</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, <strong style="color:#38bdf8">${businessName}</strong> te envió el siguiente presupuesto.</p>
      <div class="box">
        <div class="row"><span class="label">Presupuesto</span><span class="value">#${String(quoteNumber).padStart(4, "0")}</span></div>
        ${validUntil ? `<div class="row"><span class="label">Válido hasta</span><span class="value">${new Date(validUntil).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</span></div>` : ""}
      </div>
      <div class="box" style="padding:0;overflow:hidden">
        <div class="row" style="padding:12px 20px;background:rgba(255,255,255,0.04)">
          <span class="label" style="flex:1;font-weight:600;color:rgba(255,255,255,0.6)">Descripción</span>
          <span class="value" style="min-width:40px;text-align:center;color:rgba(255,255,255,0.4)">Cant.</span>
          <span class="value" style="min-width:90px;color:rgba(255,255,255,0.4)">P. unit.</span>
          <span class="value" style="min-width:90px;color:rgba(255,255,255,0.4)">Total</span>
        </div>
        <div style="padding:0 20px">${rows}</div>
        <div style="padding:12px 20px;border-top:1px solid rgba(255,255,255,0.06)">
          <div class="row"><span class="label">Subtotal</span><span class="value">${fmt(subtotal)}</span></div>
          ${discount > 0 ? `<div class="row"><span class="label" style="color:#4ade80">Descuento (${discount}%)</span><span class="value" style="color:#4ade80">−${fmt(discountAmt)}</span></div>` : ""}
          <div class="row" style="border-top:1px solid rgba(255,255,255,0.08);margin-top:4px;padding-top:12px"><span class="label" style="font-size:15px;font-weight:700;color:#fff">Total</span><span class="value" style="font-size:17px;color:#38bdf8">${fmt(total)}</span></div>
        </div>
      </div>
      ${notes ? `<p class="subtitle" style="margin-top:16px"><strong style="color:rgba(255,255,255,0.6)">Notas:</strong> ${notes}</p>` : ""}
      <p class="subtitle" style="margin-top:24px;font-size:13px">Para aceptar o consultar este presupuesto, responde a este correo o contacta directamente a ${businessName}.</p>
    `),
  })
}

// ─── Reservas de cancha (Club Deportivo) ────────────────────────────────────

function fmtCourtDate(iso: string) {
  const d = new Date(iso)
  const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()} de ${meses[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
function fmtCourtTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`
}

export async function sendCourtBookingConfirmation({
  clientName, clientEmail, businessName, courtName, startTime, endTime, price, paidAmount, sponsorName, sponsorLogo, sponsorUrl,
}: {
  clientName: string; clientEmail: string; businessName: string
  courtName: string; startTime: string; endTime: string; price: number
  paidAmount?: number; sponsorName?: string; sponsorLogo?: string; sponsorUrl?: string
}) {
  if (!process.env.RESEND_API_KEY) return
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  const displayCourtName = sponsorName ? `${courtName} ${sponsorName}` : courtName
  const gcalUrl = `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: `Reserva ${displayCourtName} — ${businessName}`,
    dates: `${fmt(startTime)}/${fmt(endTime)}`,
    details: `Reserva confirmada en ${businessName}`,
  }).toString()}`
  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Reserva confirmada — ${businessName}`,
    html: base(`
      <h1>¡Reserva confirmada! ✓</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, tu reserva en <strong style="color:#38bdf8">${businessName}</strong> está confirmada.</p>
      <div class="box">
        <div class="row"><span class="label">Cancha</span><span class="value">${displayCourtName}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${fmtCourtDate(startTime)}</span></div>
        <div class="row"><span class="label">Horario</span><span class="value">${fmtCourtTime(startTime)} – ${fmtCourtTime(endTime)} hrs</span></div>
        <div class="row"><span class="label">Precio</span><span class="value">$${price.toLocaleString("es-CL")}</span></div>
      </div>
      ${sponsorLogo ? `
      <div style="text-align:center;margin:20px 0 4px">
        <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:0 0 10px;text-transform:uppercase;letter-spacing:0.08em">Presentado por</p>
        ${sponsorUrl
          ? `<a href="${sponsorUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block"><img src="${sponsorLogo}" alt="${sponsorName ?? ""}" style="max-height:110px;max-width:280px;object-fit:contain;opacity:1;display:block" /></a>`
          : `<img src="${sponsorLogo}" alt="${sponsorName ?? ""}" style="max-height:110px;max-width:280px;object-fit:contain;opacity:1;display:block;margin:0 auto" />`
        }
      </div>` : ""}
      <div style="text-align:center;margin:24px 0 8px">
        <a href="${gcalUrl}" style="display:inline-block;background:#38bdf8;color:#0c1a2e;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.01em">
          📅 Agregar a Google Calendar
        </a>
      </div>
      <p class="subtitle" style="margin-top:16px;font-size:13px">Si tienes alguna consulta, contacta directamente a ${businessName}. ¡Te esperamos!</p>
    `),
  })
}

export async function sendCourtBookingCancellation({
  clientName, clientEmail, businessName, courtName, startTime, endTime,
}: {
  clientName: string; clientEmail: string; businessName: string
  courtName: string; startTime: string; endTime: string
}) {
  if (!process.env.RESEND_API_KEY) return
  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Reserva cancelada — ${businessName}`,
    html: base(`
      <h1>Reserva cancelada</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, tu reserva en <strong style="color:#38bdf8">${businessName}</strong> ha sido cancelada.</p>
      <div class="box">
        <div class="row"><span class="label">Cancha</span><span class="value">${courtName}</span></div>
        <div class="row"><span class="label">Fecha</span><span class="value">${fmtCourtDate(startTime)}</span></div>
        <div class="row"><span class="label">Horario</span><span class="value">${fmtCourtTime(startTime)} – ${fmtCourtTime(endTime)} hrs</span></div>
      </div>
      <p class="subtitle" style="margin-top:16px;font-size:13px">Si crees que esto es un error, contacta directamente a ${businessName}.</p>
    `),
  })
}

export async function sendCourtBookingModification({
  clientName, clientEmail, businessName, courtName, startTime, endTime, price,
}: {
  clientName: string; clientEmail: string; businessName: string
  courtName: string; startTime: string; endTime: string; price: number
}) {
  if (!process.env.RESEND_API_KEY) return
  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Reserva modificada — ${businessName}`,
    html: base(`
      <h1>Reserva modificada ✓</h1>
      <p class="subtitle">Hola <strong style="color:#fff">${clientName}</strong>, tu reserva en <strong style="color:#38bdf8">${businessName}</strong> fue actualizada.</p>
      <div class="box">
        <div class="row"><span class="label">Cancha</span><span class="value">${courtName}</span></div>
        <div class="row"><span class="label">Nueva fecha</span><span class="value">${fmtCourtDate(startTime)}</span></div>
        <div class="row"><span class="label">Nuevo horario</span><span class="value">${fmtCourtTime(startTime)} – ${fmtCourtTime(endTime)} hrs</span></div>
        <div class="row"><span class="label">Precio</span><span class="value">$${price.toLocaleString("es-CL")}</span></div>
      </div>
      <p class="subtitle" style="margin-top:16px;font-size:13px">Si tienes alguna duda, contacta directamente a ${businessName}.</p>
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

export async function sendTournamentRegistrationConfirmation({
  players, tournamentName, businessName, startDate, category, entryFee,
}: {
  players: { name: string; email: string }[]
  tournamentName: string
  businessName: string
  startDate: string
  category?: string | null
  entryFee?: number | null
}) {
  if (!process.env.RESEND_API_KEY) return

  const validPlayers = players.filter(p => p.email?.includes("@"))
  if (!validPlayers.length) return

  const feeRow = entryFee
    ? `<div class="row"><span class="label">Inscripción</span><span class="value">${entryFee.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })}</span></div>`
    : `<div class="row"><span class="label">Inscripción</span><span class="value" style="color:#4ade80">Gratuita</span></div>`

  const categoryRow = category
    ? `<div class="row"><span class="label">Categoría</span><span class="value">${category}</span></div>`
    : ""

  const namesRow = validPlayers.length > 1
    ? `<div class="row"><span class="label">Pareja / Equipo</span><span class="value">${validPlayers.map(p => p.name).join(" &amp; ")}</span></div>`
    : `<div class="row"><span class="label">Jugador</span><span class="value">${validPlayers[0].name}</span></div>`

  for (const player of validPlayers) {
    resend.emails.send({
      from: FROM,
      to: player.email,
      subject: `¡Inscripción confirmada! ${tournamentName}`,
      html: base(`
        <h1>¡Inscripción confirmada! 🏆</h1>
        <p class="subtitle">Hola <strong style="color:#fff">${player.name}</strong>, tu inscripción en <strong style="color:#C9A84C">${tournamentName}</strong> ha sido registrada exitosamente.</p>
        <div class="box">
          <div class="row"><span class="label">Torneo</span><span class="value">${tournamentName}</span></div>
          <div class="row"><span class="label">Organiza</span><span class="value">${businessName}</span></div>
          <div class="row"><span class="label">Fecha</span><span class="value">${startDate}</span></div>
          ${namesRow}
          ${categoryRow}
          ${feeRow}
        </div>
        <p class="subtitle" style="font-size:13px;margin-top:8px">Recibirás más información sobre horarios y canchas a medida que se acerque la fecha del torneo. ¡Mucho éxito!</p>
      `),
    }).catch(() => {})
  }
}

export async function sendTournamentMatchAdvance({
  winner, opponent, tournamentName, round, scheduledTime, courtNumber,
}: {
  winner: { name: string; email: string; players?: { name: string; email?: string }[] }
  opponent: { name: string }
  tournamentName: string
  round: number
  scheduledTime?: string | null
  courtNumber?: number | null
}) {
  if (!process.env.RESEND_API_KEY) return

  const recipients: { name: string; email: string }[] = [{ name: winner.name, email: winner.email }]
  if (Array.isArray(winner.players)) {
    for (const p of winner.players) {
      if (p.email && p.email !== winner.email && p.email.includes("@")) {
        recipients.push({ name: p.name, email: p.email })
      }
    }
  }

  const validRecipients = recipients.filter(r => r.email?.includes("@"))
  if (!validRecipients.length) return

  const roundLabel = `Ronda ${round}`
  const timeRow = scheduledTime
    ? `<div class="row"><span class="label">Horario</span><span class="value">${new Date(scheduledTime).toLocaleString("es-CL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span></div>`
    : ""
  const courtRow = courtNumber
    ? `<div class="row"><span class="label">Cancha</span><span class="value">Cancha ${courtNumber}</span></div>`
    : ""

  for (const recipient of validRecipients) {
    resend.emails.send({
      from: FROM,
      to: recipient.email,
      subject: `¡Avanzas a la siguiente ronda! — ${tournamentName}`,
      html: base(`
        <h1>¡Felicitaciones, ${recipient.name}! 🏆</h1>
        <p class="subtitle">Avanzaste a la <strong style="color:#C9A84C">${roundLabel}</strong> de <strong style="color:#fff">${tournamentName}</strong>. ¡Sigue así!</p>
        <div class="box">
          <div class="row"><span class="label">Torneo</span><span class="value">${tournamentName}</span></div>
          <div class="row"><span class="label">Ronda</span><span class="value" style="color:#C9A84C">${roundLabel}</span></div>
          <div class="row"><span class="label">Próximo rival</span><span class="value" style="color:#fff;font-weight:700">${opponent.name}</span></div>
          ${timeRow}
          ${courtRow}
        </div>
        <p class="subtitle" style="font-size:13px;margin-top:8px">Prepárate bien para el próximo enfrentamiento. ¡Mucha suerte!</p>
      `),
    }).catch(() => {})
  }
}
