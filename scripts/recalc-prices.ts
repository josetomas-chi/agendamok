/**
 * Recalcula precios de CourtBookings CONFIRMED no pagadas.
 * Uso:
 *   npx tsx scripts/recalc-prices.ts          → preview (no modifica nada)
 *   npx tsx scripts/recalc-prices.ts --apply  → aplica los cambios
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { calcCourtPrice, calcCoachBookingPrice } from "../src/lib/pricing"
import { utcToChileLocal } from "../src/lib/timezone"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, ssl: true })
const prisma = new PrismaClient({ adapter })
const apply = process.argv.includes("--apply")

async function main() {
  console.log(apply ? "🔧 MODO APLICAR — modificando DB..." : "👁  MODO PREVIEW — sin cambios en DB\n")

  const bookings = await prisma.courtBooking.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      court: { include: { pricingRules: true } },
      coach: { include: { feeRules: true } },
    },
  })

  console.log(`Reservas candidatas: ${bookings.length}\n`)

  let changed = 0
  let errors = 0

  const rows: Array<{
    id: string
    fecha: string
    tipo: string
    nombre: string
    precioActual: number
    precioNuevo: number
    diff: number
  }> = []

  // Solo CONFIRMED/PENDING y sin pago completo
  const unpaid = bookings.filter(b =>
    ["CONFIRMED", "PENDING"].includes(b.status) &&
    Number(b.paidAmount ?? 0) < Number(b.price)
  )
  console.log(`Sin pagos completos: ${unpaid.length}\n`)

  for (const b of unpaid) {
    try {
      const startChile = utcToChileLocal(b.startTime)
      const endChile   = utcToChileLocal(b.endTime)
      let newPrice: number

      if (b.coach) {
        newPrice = calcCoachBookingPrice(b.coach as Parameters<typeof calcCoachBookingPrice>[0], startChile, endChile)
      } else {
        newPrice = calcCourtPrice(b.court.pricingRules, startChile, endChile)
      }

      const currentPrice = Number(b.price)
      const diff = newPrice - currentPrice

      if (Math.abs(diff) < 1) continue // sin cambio significativo

      const startStr = utcToChileLocal(b.startTime).toISOString().replace("T", " ").slice(0, 16)
      const tipo = b.coach ? `CLASE (coach: ${b.coach.name})` : "RESERVA COMÚN"
      const nombre = `Cancha ${b.court.name}`

      rows.push({
        id: b.id,
        fecha: startStr,
        tipo,
        nombre,
        precioActual: currentPrice,
        precioNuevo: newPrice,
        diff,
      })

      if (apply) {
        await prisma.courtBooking.update({
          where: { id: b.id },
          data: { price: newPrice },
        })
      }

      changed++
    } catch (e) {
      console.error(`  ❌ Error en booking ${b.id}:`, e)
      errors++
    }
  }

  // Tabla resumen
  if (rows.length === 0) {
    console.log("✅ Ninguna reserva requiere corrección.")
  } else {
    console.log(`${"Fecha".padEnd(18)} ${"Cancha".padEnd(16)} ${"Tipo".padEnd(30)} ${"Actual".padStart(10)} ${"Nuevo".padStart(10)} ${"Diff".padStart(10)}`)
    console.log("─".repeat(100))
    for (const r of rows) {
      const sign = r.diff > 0 ? "+" : ""
      console.log(
        `${r.fecha.padEnd(18)} ${r.nombre.padEnd(16)} ${r.tipo.padEnd(30)} ${("$" + r.precioActual.toLocaleString("es-CL")).padStart(10)} ${("$" + r.precioNuevo.toLocaleString("es-CL")).padStart(10)} ${(sign + "$" + Math.abs(r.diff).toLocaleString("es-CL")).padStart(10)}`
      )
    }
    console.log("─".repeat(100))
    const totalDiff = rows.reduce((s, r) => s + r.diff, 0)
    console.log(`\n${apply ? "✅ Corregidas" : "📋 Por corregir"}: ${changed} reservas | Errores: ${errors}`)
    console.log(`Variación total: ${totalDiff >= 0 ? "+" : ""}$${Math.abs(totalDiff).toLocaleString("es-CL")}`)
  }

  if (!apply && rows.length > 0) {
    console.log("\nEjecuta con --apply para aplicar los cambios:")
    console.log("  npx tsx scripts/recalc-prices.ts --apply")
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
