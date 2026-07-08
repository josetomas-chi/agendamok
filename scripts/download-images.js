const https = require('https')
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, 'slide-images')
if (!fs.existsSync(dir)) fs.mkdirSync(dir)

// Unsplash CDN — specific photo IDs curated for each slide
const images = [
  { name: 'cover-barber.jpg',    id: '1503951914875-452162b0f3f1', w:800, h:500 },
  { name: 'cover-spa.jpg',       id: '1560066984-138dadb4c035',    w:800, h:500 },
  { name: 'cover-gym.jpg',       id: '1534438327276-14e5300c3a48', w:800, h:500 },
  { name: 'cover-dentist.jpg',   id: '1588776814546-1ffedbe47add', w:800, h:500 },
  { name: 'problem-stress.jpg',  id: '1507679799987-c73779587ccf', w:800, h:500 },
  { name: 'solution-tablet.jpg', id: '1460925895917-afdab827c52f', w:800, h:500 },
  { name: 'booking-phone.jpg',   id: '1512941937669-90a1b58e7e9c', w:800, h:500 },
  { name: 'client-happy.jpg',    id: '1559599101-f09722fb4948',    w:800, h:500 },
  { name: 'team-work.jpg',       id: '1522202176988-66273c2fd55f', w:800, h:500 },
  { name: 'closing-happy.jpg',   id: '1551836022-d5d88e9218df',    w:800, h:500 },
]

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { console.log(`  ✓ ya existe: ${path.basename(dest)}`); resolve(); return }
    const file = fs.createWriteStream(dest)
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        fs.unlinkSync(dest)
        download(res.headers.location, dest).then(resolve).catch(reject)
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); console.log(`  ✓ ${path.basename(dest)}`); resolve() })
    }).on('error', err => { fs.unlinkSync(dest); reject(err) })
  })
}

async function main() {
  console.log('Descargando imágenes de Unsplash...')
  for (const img of images) {
    const url = `https://images.unsplash.com/photo-${img.id}?w=${img.w}&h=${img.h}&fit=crop&q=80&auto=format`
    await download(url, path.join(dir, img.name)).catch(e => console.error(`  ✗ ${img.name}: ${e.message}`))
  }
  console.log('✓ Listo')
}

main()
