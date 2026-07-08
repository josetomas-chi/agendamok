const sharp = require("sharp")
const path = require("path")

const input = path.join(__dirname, "../public/mok-icon.png")
const output = path.join(__dirname, "../public/mok-icon.png")
const W = 256

async function run() {
  // 1. Leer el PNG original y extraer solo los píxeles blancos (el ícono)
  const { data, info } = await sharp(input)
    .resize(W, W)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  const masked = Buffer.alloc(width * height * 4)

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const a = data[i * 4 + 3]
    const brightness = (r + g + b) / 3
    if (brightness > 180 && a > 50) {
      masked[i * 4] = 255
      masked[i * 4 + 1] = 255
      masked[i * 4 + 2] = 255
      masked[i * 4 + 3] = a
    } else {
      masked[i * 4 + 3] = 0
    }
  }

  const whitePng = await sharp(masked, { raw: { width, height, channels: 4 } }).png().toBuffer()

  // 2. Crear fondo gradiente como PNG usando sharp flatten + color
  // Gradiente simple: color sólido #0ea5e9 con tint a #38bdf8
  // Usamos compositing: fondo azul sólido + overlay con blanco semitransparente diagonal
  const bgSvg = Buffer.from(`<svg width="${W}" height="${W}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="${W}" y2="${W}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#0ea5e9"/>
        <stop offset="100%" stop-color="#38bdf8"/>
      </linearGradient>
      <clipPath id="c"><circle cx="${W/2}" cy="${W/2}" r="${W/2}"/></clipPath>
    </defs>
    <circle cx="${W/2}" cy="${W/2}" r="${W/2}" fill="url(#g)"/>
  </svg>`)

  const bgPng = await sharp(bgSvg).png().toBuffer()

  // 3. Componer: fondo + ícono blanco
  await sharp(bgPng)
    .composite([{ input: whitePng, blend: "over" }])
    .png()
    .toFile(output)

  console.log("✅ mok-icon.png actualizado con colores de marca")
}

run().catch(console.error)
