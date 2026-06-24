const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

const FONTS = path.join(__dirname, 'fonts')
const IMGS  = path.join(__dirname, 'slide-images')

const W = 960, H = 540

const C = {
  bg:     '#1c1c1e',
  card:   '#2c2c30',
  border: '#3a3a3c',
  sky:    '#38bdf8',
  skyD:   '#0ea5e9',
  white:  '#ffffff',
  muted:  '#a1a1aa',
}

const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true })
doc.registerFont('R',  path.join(FONTS, 'Geist-Regular.ttf'))
doc.registerFont('B',  path.join(FONTS, 'Geist-Medium.ttf'))
doc.registerFont('OB', path.join(FONTS, 'Geist-Bold.ttf'))

doc.pipe(fs.createWriteStream('AgendaMok-Slides.pdf'))

// ── helpers ──────────────────────────────────────────────────────
const o = (op, fn) => { doc.save(); doc.opacity(op); fn(); doc.restore() }
function bg() { doc.rect(0,0,W,H).fill(C.bg) }
function topBar() { doc.rect(0,0,W,3).fill(C.sky) }

function logo(x, y, sz) {
  sz = sz || 28
  doc.roundedRect(x, y, sz, sz, sz*0.22).fill(C.skyD)
  doc.rect(x+sz*0.18, y+sz*0.18, sz*0.64, sz*0.12).fill(C.white)
  const d=sz*0.09, pad=sz*0.18, step=(sz*0.64)/2.6
  ;[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]].forEach(([c,r]) => {
    doc.roundedRect(x+pad+c*step, y+sz*0.4+r*sz*0.17, d, d, 1).fill(C.white)
  })
}

function header(label, title) {
  topBar()
  doc.image(path.join(IMGS, 'logo-128.png'), W-42, 10, { width: 22, height: 22 })
  doc.font('B').fontSize(8).fillColor(C.sky).text(label.toUpperCase(), 48, 20)
  doc.font('OB').fontSize(24).fillColor(C.white).text(title, 48, 34)
  o(0.08, () => doc.moveTo(48,88).lineTo(W-48,88).lineWidth(0.5).stroke(C.white))
}

function card(x, y, w, h, hi) {
  doc.roundedRect(x,y,w,h,10).fill(hi ? '#112233' : C.card)
  o(hi ? 0.5 : 0.25, () => doc.roundedRect(x,y,w,h,10).lineWidth(0.5).stroke(hi ? C.sky : C.border))
}

function pill(text, x, y) {
  doc.font('R').fontSize(8)
  const tw = doc.widthOfString(text), pw = tw+16
  o(0.15, () => doc.roundedRect(x,y,pw,17,8).fill(C.sky))
  o(0.4,  () => doc.roundedRect(x,y,pw,17,8).lineWidth(0.5).stroke(C.sky))
  doc.font('R').fontSize(8).fillColor(C.sky).text(text, x+8, y+4, { lineBreak:false })
  return pw+6
}

function check(text, x, y, w, col) {
  doc.circle(x+4,y+5,3).fill(C.sky)
  doc.font('R').fontSize(9).fillColor(col||C.muted).text(text, x+14, y, { width:w-14, lineBreak:false })
}

// Clip an image into a rounded rect
function imgClip(file, x, y, w, h, r) {
  r = r || 0
  doc.save()
  if (r > 0) {
    doc.roundedRect(x, y, w, h, r).clip()
  } else {
    doc.rect(x, y, w, h).clip()
  }
  doc.image(file, x, y, { width: w, height: h, cover: [w, h] })
  doc.restore()
}

// Dark overlay on image
function imgOverlay(x, y, w, h, op, color) {
  o(op || 0.55, () => doc.rect(x,y,w,h).fill(color || C.bg))
}

// ══════════════════════════════════════════════════════
// S1 — Portada
// ══════════════════════════════════════════════════════
bg(); topBar()

// Right half: photo collage grid (2x2)
const imgs = ['cover-barber.jpg','cover-spa.jpg','cover-gym.jpg','cover-dentist.jpg']
const half = W/2, cw2 = half/2 - 3, ch2 = H/2 - 3
imgs.forEach((img, i) => {
  const col = i%2, row = Math.floor(i/2)
  const ix = half + col*(cw2+6), iy = row*(ch2+6)
  imgClip(path.join(IMGS,img), ix, iy, cw2, ch2)
})
// Dark gradient over right half (left edge fully opaque, right edge transparent)
o(0.5, () => {
  const grad = doc.linearGradient(half, 0, W, 0)
  grad.stop(0, C.bg, 1).stop(1, C.bg, 0)
  doc.rect(half, 0, W/2, H).fill(grad)
})
o(0.3, () => doc.rect(half, 0, W/2, H).fill(C.bg))

// Left side content
// Orbs
o(0.06, () => doc.circle(80, H-80, 140).fill(C.sky))
o(0.04, () => doc.circle(80, H-80, 70).fill(C.sky))

// Grid subtle
o(0.025, () => {
  for (let x=0; x<W/2; x+=48) doc.moveTo(x,0).lineTo(x,H).lineWidth(0.5).stroke(C.white)
  for (let y=0; y<H; y+=48)   doc.moveTo(0,y).lineTo(half,y).lineWidth(0.5).stroke(C.white)
})

// Logo real (PNG desde icon.svg)
doc.image(path.join(IMGS, 'logo-256.png'), 52, 42, { width: 56, height: 56 })

// Brand
doc.font('OB').fontSize(44)
  .fillColor(C.white).text('Agenda', 52, 112, { continued:true, lineBreak:false })
  .fillColor(C.sky).text('Mok')

// Tagline
o(0.8, () => doc.font('R').fontSize(13).fillColor(C.white)
  .text('El verdadero Copiloto de tu negocio', 52, 170))

// Thin line
o(0.3, () => doc.moveTo(52,196).lineTo(200,196).lineWidth(1).stroke(C.sky))

doc.font('R').fontSize(10).fillColor(C.muted)
  .text('Plataforma de gestión de reservas\ny turnos para negocios de servicio', 52, 208)

// Pills
let px = 52
;['Peluquería','Spa','Médico','Gym','Dentista','Psicología'].forEach(p => { px += pill(p, px, 270) })

// Business types caption on photo side
o(0.7, () => {
  ;['Peluquería','Spa','Gimnasio','Odontología'].forEach((label, i) => {
    const col=i%2, row=Math.floor(i/2)
    const lx = half+12+col*cw2, ly = row*(ch2+6)+ch2-22
    doc.font('B').fontSize(8).fillColor(C.white).text(label, lx, ly, { width:cw2-12, lineBreak:false })
  })
})

o(0.3, () => doc.font('R').fontSize(9).fillColor(C.muted).text('agendamok.cl  ·  2026', 0, H-26, { align:'center', width:W }))

// ══════════════════════════════════════════════════════
// S2 — El problema
// ══════════════════════════════════════════════════════
doc.addPage(); bg()
header('El problema', 'Gestionar un negocio de servicio\nes caótico.')

// Right photo
imgClip(path.join(IMGS,'problem-stress.jpg'), W/2+20, 96, W/2-68, H-120, 12)
imgOverlay(W/2+20, 96, W/2-68, H-120, 0.3)
o(0.6, () => {
  const g = doc.linearGradient(W/2+20, 0, W-48, 0)
  g.stop(0, C.bg, 1).stop(1, C.bg, 0)
  doc.rect(W/2+20, 96, 120, H-120).fill(g)
})

const probs = [
  '📞  Reservas por WhatsApp o papel',
  '📋  Planillas de Excel para el equipo',
  '💸  Cobros manuales sin registro',
  '🤷  Clientes que no avisan cuando cancelan',
  '📊  Sin visibilidad de ingresos ni métricas',
]
probs.forEach((p, i) => {
  const py = 100 + i*74
  card(48, py, W/2-24, 60)
  doc.font('R').fontSize(10).fillColor(C.white).text(p, 72, py+20, { width: W/2-80, lineBreak:false })
})

// Big stat overlay on photo
o(0.85, () => {
  doc.font('OB').fontSize(52).fillColor(C.sky).text('3h', W-200, 160, { lineBreak:false })
  doc.font('R').fontSize(11).fillColor(C.white).text('al día perdidas en\ngestión administrativa', W-200, 222)
  o(0.4, () => doc.moveTo(W-200, 272).lineTo(W-60, 272).lineWidth(0.5).stroke(C.white))
  doc.font('OB').fontSize(34).fillColor(C.white).text('30%', W-200, 284, { lineBreak:false })
  doc.font('R').fontSize(10).fillColor(C.muted).text('turnos cancelados\nsin aviso previo', W-200, 326)
})

o(0.3, () => doc.font('R').fontSize(9).fillColor(C.muted).text('agendamok.cl', 0, H-18, { align:'center', width:W }))

// ══════════════════════════════════════════════════════
// S3 — La solución
// ══════════════════════════════════════════════════════
doc.addPage(); bg()
header('La solución', 'AgendaMok lo resuelve todo\ndesde un solo lugar.')

// Background photo left
imgClip(path.join(IMGS,'solution-tablet.jpg'), 48, 96, W/2-72, H-120, 12)
imgOverlay(48, 96, W/2-72, H-120, 0.4)
o(0.5, () => {
  const g = doc.linearGradient(W/2-72, 0, W/2+48, 0)
  g.stop(0, C.bg, 0).stop(1, C.bg, 1)
  doc.rect(W/2-72, 96, 120, H-120).fill(g)
})
// Quote over image
o(0.9, () => {
  doc.font('OB').fontSize(20).fillColor(C.sky)
    .text('"Configura una vez.\nFunciona solo."', 64, 140, { width: W/2-100 })
  doc.font('R').fontSize(10).fillColor(C.white)
    .text('Un solo panel para todo tu negocio, tu equipo y tus clientes.', 64, 210, { width: W/2-100 })
})

// Right: modules list — clean rows with sky accent bar
const mods = [
  { label:'Turnos',    desc:'Calendario, agenda y reservas en tiempo real' },
  { label:'Clientes',  desc:'CRM con historial de visitas y pagos' },
  { label:'Servicios', desc:'Catálogo con precios, duración y colores' },
  { label:'Staff',     desc:'Profesionales, horarios y comisiones' },
  { label:'Pagos',     desc:'POS presencial + cobro online con Flow' },
  { label:'Boletas',   desc:'Emisión de DTEs electrónicos vía Bsale + SII' },
  { label:'Reportes',  desc:'KPIs, gráficos y exportación a CSV' },
  { label:'Marketing', desc:'Campañas, gift cards y descuentos' },
  { label:'Config.',   desc:'Datos del negocio, marca y automatizaciones' },
]
const mStartX = W/2 + 8
const mW = W - mStartX - 48
const mRowH = (H - 120) / mods.length
mods.forEach((m, i) => {
  const my = 96 + i * mRowH
  // Subtle separator
  if (i > 0) o(0.12, () => doc.moveTo(mStartX, my).lineTo(mStartX + mW, my).lineWidth(0.5).stroke(C.white))
  // Sky accent bar left
  doc.roundedRect(mStartX, my + mRowH*0.22, 3, mRowH*0.55, 1.5).fill(i % 2 === 0 ? C.sky : C.skyD)
  // Label + desc
  doc.font('B').fontSize(10).fillColor(C.white)
    .text(m.label, mStartX + 14, my + mRowH*0.18, { lineBreak:false })
  doc.font('R').fontSize(8.5).fillColor(C.muted)
    .text(m.desc, mStartX + 14, my + mRowH*0.48, { width: mW - 14, lineBreak:false })
})

o(0.3, () => doc.font('R').fontSize(9).fillColor(C.muted).text('agendamok.cl', 0, H-18, { align:'center', width:W }))

// ══════════════════════════════════════════════════════
// S4 — Para quién es
// ══════════════════════════════════════════════════════
doc.addPage(); bg()
header('¿Para quién es?', 'Diseñado para cualquier\nnegocio de servicio.')

// 8 cards equal size — 2 rows × 4 columns
const allSectors = [
  { img:'cover-barber.jpg',  label:'Peluquerías & Barberías' },
  { img:'cover-spa.jpg',     label:'Spas & Estética'         },
  { img:'cover-gym.jpg',     label:'Gimnasios & Fitness'     },
  { img:'cover-dentist.jpg', label:'Salud & Medicina'        },
  { img:'sector-fisio.jpg',  label:'Fisioterapia'            },
  { img:'sector-nails.jpg',  label:'Uñas & Manos'            },
  { img:'sector-nutri.jpg',  label:'Nutrición'               },
  { img:'sector-psico.jpg',  label:'Psicología'              },
]
const sgap = 8
const scols = 4, srows = 2
const sw = (W - 96 - sgap*(scols-1)) / scols
const sh = (H - 116 - sgap*(srows-1)) / srows
const sx0 = 48, sy0 = 100

allSectors.forEach((s, i) => {
  const col = i % scols, row = Math.floor(i / scols)
  const sx = sx0 + col*(sw+sgap)
  const sy = sy0 + row*(sh+sgap)
  imgClip(path.join(IMGS,s.img), sx, sy, sw, sh, 8)
  o(0.12, () => doc.rect(sx, sy, sw, sh).fill(C.bg))
  o(0.78, () => {
    const g = doc.linearGradient(0, sy+sh*0.5, 0, sy+sh)
    g.stop(0, C.bg, 0).stop(1, C.bg, 1)
    doc.rect(sx, sy+sh*0.5, sw, sh*0.5).fill(g)
  })
  doc.roundedRect(sx, sy, sw, 3, 0).fill(row===0 ? C.sky : C.skyD)
  doc.font('B').fontSize(9).fillColor(C.white).text(s.label, sx+6, sy+sh-22, { width:sw-12, align:'center' })
})

// Bottom tagline
o(0.06, () => doc.roundedRect(48, H-32, W-96, 18, 5).fill(C.sky))
doc.font('R').fontSize(8).fillColor(C.sky)
  .text('Y también: veterinaria · legal · educación · coaching · y más', 0, H-27, { align:'center', width:W })

o(0.3, () => doc.font('R').fontSize(7).fillColor(C.muted).text('agendamok.cl', 0, H-14, { align:'center', width:W }))

// ══════════════════════════════════════════════════════
// S5 — Experiencia del cliente (rediseño landing-style)
// ══════════════════════════════════════════════════════
doc.addPage(); bg(); topBar()

// Full-bleed photo background izq
imgClip(path.join(IMGS,'booking-phone.jpg'), 0, 0, W*0.42, H)
o(0.35, () => {
  const gL = doc.linearGradient(W*0.28, 0, W*0.42, 0)
  gL.stop(0, C.bg, 0).stop(1, C.bg, 1)
  doc.rect(W*0.28, 0, W*0.14, H).fill(gL)
})

// Right panel
const rx = W*0.42 + 24
doc.font('B').fontSize(8).fillColor(C.sky).text('EXPERIENCIA DEL CLIENTE', rx, 22)
doc.font('B').fontSize(26).fillColor(C.white).text('Reservar un turno,\nasí de simple.', rx, 38)

// URL chip — like the landing's link pill
o(0.12, () => doc.roundedRect(rx, 100, W - rx - 48, 26, 13).fill(C.sky))
o(0.35, () => doc.roundedRect(rx, 100, W - rx - 48, 26, 13).lineWidth(0.5).stroke(C.sky))
doc.font('B').fontSize(9).fillColor(C.sky)
  .text('agendamok.cl/book/tu-negocio', rx + 14, 108, { lineBreak:false })

// Steps — horizontal cards like landing feature rows
const steps5 = [
  { n:'01', t:'Recibe el link',           d:'El negocio comparte su URL pública. Sin apps, sin registro.' },
  { n:'02', t:'Elige servicio y hora',    d:'Catálogo de servicios con precio, duración y profesional.' },
  { n:'03', t:'Confirma en segundos',     d:'Solo tu nombre y teléfono. Cero fricciones.' },
  { n:'04', t:'Pago online (opcional)',   d:'Flow integrado. Cobro seguro directo al negocio.' },
  { n:'05', t:'Email de confirmación',   d:'Todos los detalles del turno al instante en tu bandeja.' },
]
steps5.forEach(({ n, t, d }, i) => {
  const sy5 = 138 + i * 74
  // card row
  o(i===0 ? 0.12 : 0.06, () => doc.roundedRect(rx, sy5, W-rx-48, 64, 8).fill(C.sky))
  o(i===0 ? 0.4 : 0.12, () => doc.roundedRect(rx, sy5, W-rx-48, 64, 8).lineWidth(0.5).stroke(i===0 ? C.sky : C.border))
  // number
  doc.font('B').fontSize(11).fillColor(i===0 ? C.sky : C.skyD)
    .text(n, rx+16, sy5+22, { lineBreak:false })
  // divider
  o(0.2, () => doc.moveTo(rx+50, sy5+12).lineTo(rx+50, sy5+52).lineWidth(0.5).stroke(C.white))
  // title + desc
  doc.font('B').fontSize(10).fillColor(C.white).text(t, rx+62, sy5+12, { lineBreak:false })
  doc.font('R').fontSize(8.5).fillColor(C.muted).text(d, rx+62, sy5+28, { width: W-rx-130 })
})

o(0.25, () => doc.font('R').fontSize(8).fillColor(C.muted).text('agendamok.cl', 0, H-14, { align:'center', width:W }))

// ══════════════════════════════════════════════════════
// S6 — Panel del negocio (landing-style: foto full, stats grandes, texto jerarquizado)
// ══════════════════════════════════════════════════════
doc.addPage(); bg(); topBar()

// Foto full-bleed de fondo
imgClip(path.join(IMGS,'team-work.jpg'), 0, 0, W, H)
// Overlay oscuro fuerte para que el contenido sea legible
o(0.82, () => doc.rect(0, 0, W, H).fill(C.bg))
// Gradiente sky sutil en esquina superior izquierda
o(0.08, () => {
  const gOrb = doc.radialGradient(120, 80, 0, 120, 80, 280)
  gOrb.stop(0, C.sky, 1).stop(1, C.sky, 0)
  doc.rect(0, 0, W, H).fill(gOrb)
})

// Línea sky vertical divisora
o(0.3, () => doc.moveTo(W/2, 56).lineTo(W/2, H-40).lineWidth(0.5).stroke(C.sky))

// ── Columna izquierda ──
doc.font('B').fontSize(8).fillColor(C.sky).text('PARA EL NEGOCIO', 48, 24)

// Claim grande
doc.font('B').fontSize(32).fillColor(C.white)
  .text('Un panel.\nTodo bajo control.', 48, 42, { width: W/2 - 80 })

// Tres stats grandes estilo landing
const bigStats = [
  { val: '∞',   lbl: 'Turnos\nilimitados' },
  { val: '0%',  lbl: 'Comisiones\nde AgendaMok' },
  { val: '24/7', lbl: 'Booking\nonline' },
]
bigStats.forEach(({ val, lbl }, i) => {
  const bsx = 48 + i * ((W/2 - 80) / 3)
  const bsy = 185
  doc.font('B').fontSize(28).fillColor(C.sky).text(val, bsx, bsy, { lineBreak:false })
  doc.font('R').fontSize(8).fillColor(C.muted).text(lbl, bsx, bsy+34, { width: 90 })
})

// Línea divisoria
o(0.15, () => doc.moveTo(48, 272).lineTo(W/2-48, 272).lineWidth(0.5).stroke(C.white))

// Lista de módulos compacta
const mods6 = ['Turnos · Clientes · Servicios', 'Staff · Horarios · Comisiones', 'Pagos POS + Flow online', 'Reportes + exportación CSV', 'Marketing · Gift cards · Descuentos']
mods6.forEach((m, i) => {
  const my6 = 284 + i * 38
  doc.roundedRect(48, my6+6, 4, 22, 2).fill(i % 2 === 0 ? C.sky : C.skyD)
  doc.font('B').fontSize(9).fillColor(C.white).text(m, 62, my6+10, { lineBreak:false })
})

// ── Columna derecha: feature destacada ──
const rx6 = W/2 + 32

// Badge "Todo en uno"
doc.roundedRect(rx6, 24, 90, 20, 10).fill(C.skyD)
doc.font('B').fontSize(8).fillColor(C.white).text('TODO EN UNO', rx6+10, 30, { lineBreak:false })

doc.font('B').fontSize(22).fillColor(C.white)
  .text('Gestiona tu negocio\ncomo un profesional.', rx6, 56, { width: W/2 - 80 })
doc.font('R').fontSize(10).fillColor(C.muted)
  .text('AgendaMok centraliza turnos, clientes, cobros y reportes en una sola plataforma — sin planillas, sin papel, sin caos.', rx6, 120, { width: W/2 - 80 })

// Tres beneficios destacados
const benefits = [
  ['Sin límite de turnos',       'Agenda todo lo que necesites sin restricciones.'],
  ['Cero comisiones',            'Lo que cobras a tus clientes es 100% tuyo.'],
  ['Listo en menos de 5 minutos','Configura y empieza a recibir reservas hoy.'],
]
benefits.forEach(([title, desc], i) => {
  const by6 = 210 + i * 90
  // Número grande como acento visual
  o(0.06, () => doc.font('B').fontSize(64).fillColor(C.sky).text(String(i+1), rx6, by6-10, { lineBreak:false }))
  doc.font('B').fontSize(11).fillColor(C.white).text(title, rx6, by6+8, { lineBreak:false })
  doc.font('R').fontSize(8.5).fillColor(C.muted).text(desc, rx6, by6+24, { width: W/2 - 80 })
  if (i < 2) o(0.1, () => doc.moveTo(rx6, by6+82).lineTo(W-48, by6+82).lineWidth(0.5).stroke(C.white))
})

o(0.25, () => doc.font('R').fontSize(8).fillColor(C.muted).text('agendamok.cl', 0, H-14, { align:'center', width:W }))

// ══════════════════════════════════════════════════════
// S7 — Automatizaciones (mismo estilo S6, foto distinta)
// ══════════════════════════════════════════════════════
doc.addPage(); bg(); topBar()

// Foto full-bleed — distinta a S6 y S8
imgClip(path.join(IMGS,'closing-happy.jpg'), 0, 0, W, H)
o(0.82, () => doc.rect(0, 0, W, H).fill(C.bg))
// Orbe sky — esquina inferior derecha (contraste con S6)
o(0.08, () => {
  const gOrb7 = doc.radialGradient(W-100, H-80, 0, W-100, H-80, 260)
  gOrb7.stop(0, C.sky, 1).stop(1, C.sky, 0)
  doc.rect(0, 0, W, H).fill(gOrb7)
})

// Línea divisora
o(0.3, () => doc.moveTo(W/2, 56).lineTo(W/2, H-40).lineWidth(0.5).stroke(C.sky))

// ── Columna izquierda ──
doc.font('B').fontSize(8).fillColor(C.sky).text('AUTOMATIZACIONES', 48, 24)
doc.font('B').fontSize(32).fillColor(C.white)
  .text('Trabaja menos.\nAgendaMok trabaja\npor ti.', 48, 42, { width: W/2 - 80 })

// Stat grande: horas ahorradas
o(0.06, () => doc.font('B').fontSize(80).fillColor(C.sky).text('3h', 48, 195, { lineBreak:false }))
doc.font('B').fontSize(13).fillColor(C.white).text('al día ahorradas', 48, 210, { lineBreak:false })
doc.font('R').fontSize(9).fillColor(C.muted).text('en gestión manual eliminada con\nautomatizaciones activas.', 48, 228)

o(0.15, () => doc.moveTo(48, 275).lineTo(W/2-48, 275).lineWidth(0.5).stroke(C.white))

// Tres stats compactos
const autoStats = [['−30%','Ausencias'],['100%','Automático'],['0','Llamadas extra']]
autoStats.forEach(([val, lbl], i) => {
  const asx = 48 + i * ((W/2 - 80) / 3)
  doc.font('B').fontSize(20).fillColor(C.sky).text(val, asx, 285, { lineBreak:false })
  doc.font('R').fontSize(8).fillColor(C.muted).text(lbl, asx, 310)
})

// ── Columna derecha: lista de automatizaciones ──
const rx7 = W/2 + 32

const badge7Text = 'INCLUIDO EN TODOS LOS PLANES'
doc.font('B').fontSize(8)
const badge7W = doc.widthOfString(badge7Text) + 20
doc.roundedRect(rx7, 24, badge7W, 20, 10).fill(C.skyD)
doc.fillColor(C.white).text(badge7Text, rx7+10, 30, { lineBreak:false })

doc.font('B').fontSize(22).fillColor(C.white)
  .text('Se activan solas.\nTú solo atiendes.', rx7, 58, { width: W/2 - 80 })
doc.font('R').fontSize(9.5).fillColor(C.muted)
  .text('Sin configuraciones complejas. Cada automatización funciona desde el primer turno.', rx7, 118, { width: W/2 - 80 })

const autos7 = [
  ['WhatsApp 24h antes',    'Recordatorio automático al cliente antes de su turno.'],
  ['Email 1h antes',        'Confirmación puntual — reduce el ausentismo hasta un 30%.'],
  ['Resumen diario al dueño','Cada mañana recibe los turnos del día en su email.'],
  ['Reactivación de clientes','Campaña automática a clientes sin reservas en 60 días.'],
  ['Confirmación al pagar', 'Flow confirma el turno al instante, sin intervención.'],
  ['Boleta automática',     'Se emite la boleta electrónica (SII) al confirmar el pago.'],
  ['Sync Google Calendar',  'Cada turno aparece en el calendario del profesional.'],
]
autos7.forEach(([title, desc], i) => {
  const ay7 = 152 + i * 50
  // Accent bar alternando sky/skyD
  doc.roundedRect(rx7, ay7+6, 3, 32, 1.5).fill(i % 2 === 0 ? C.sky : C.skyD)
  doc.font('B').fontSize(9).fillColor(C.white).text(title, rx7+14, ay7+6, { lineBreak:false })
  doc.font('R').fontSize(7.5).fillColor(C.muted).text(desc, rx7+14, ay7+20, { width: W/2 - 90 })
  if (i < autos7.length - 1) o(0.08, () => doc.moveTo(rx7, ay7+44).lineTo(W-48, ay7+44).lineWidth(0.5).stroke(C.white))
})

o(0.25, () => doc.font('R').fontSize(8).fillColor(C.muted).text('agendamok.cl', 0, H-14, { align:'center', width:W }))

// ══════════════════════════════════════════════════════
// S8 — Cierre
// ══════════════════════════════════════════════════════
doc.addPage(); bg(); topBar()

// Full bleed photo background
imgClip(path.join(IMGS,'client-happy.jpg'), 0, 0, W, H)
imgOverlay(0, 0, W, H, 0.7)
o(0.15, () => doc.rect(0,0,W,H).fill(C.sky))

// Center content
doc.image(path.join(IMGS, 'logo-256.png'), W/2-28, H/2-126, { width: 56, height: 56 })
doc.font('OB').fontSize(44).fillColor(C.white)
  .text('Agenda', W/2-114, H/2-54, { continued:true, lineBreak:false })
  .fillColor(C.sky).text('Mok')

doc.font('R').fontSize(13).fillColor(C.white)
  .text('El verdadero Copiloto de tu negocio', 0, H/2+2, { align:'center', width:W })

o(0.3, () => doc.moveTo(W/2-44,H/2+28).lineTo(W/2+44,H/2+28).lineWidth(1).stroke(C.sky))

doc.font('B').fontSize(14).fillColor(C.sky)
  .text('Empieza gratis hoy', 0, H/2+44, { align:'center', width:W })
doc.font('R').fontSize(11).fillColor(C.white)
  .text('agendamok.cl  ·  contacto@agendamok.cl', 0, H/2+66, { align:'center', width:W })

const btnW=220, btnH=42, btnX=W/2-btnW/2, btnY=H/2+96
doc.roundedRect(btnX, btnY, btnW, btnH, 8).fill(C.sky)
doc.font('B').fontSize(13).fillColor(C.bg)
  .text('Probar 30 días gratis →', btnX, btnY+13, { align:'center', width:btnW })

doc.end()
console.log('✓ AgendaMok-Slides.pdf (9 slides 16:9 con fotos)')
