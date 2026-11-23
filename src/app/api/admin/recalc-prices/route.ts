import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calcCourtPrice, calcCoachBookingPrice } from "@/lib/pricing"
import { utcToChileLocal } from "@/lib/timezone"

// GET /api/admin/recalc-prices?apply=1
// Sin ?apply → solo preview. Con ?apply=1 → aplica cambios.
const ADMIN_EMAIL = "josetomas@bullpadel.cl"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const apply = new URL(req.url).searchParams.get("apply") === "1"

  const bookings = await prisma.courtBooking.findMany({
    where: { deletedAt: null },
    include: {
      court: { include: { pricingRules: true } },
      coach: { include: { feeRules: true } },
    },
  })

  const active = bookings.filter(b =>
    ["CONFIRMED", "PENDING"].includes(b.status) &&
    Number(b.paidAmount ?? 0) < Number(b.price)
  )

  const rows: Array<{
    id: string
    fecha: string
    tipo: string
    cancha: string
    precioActual: number
    precioNuevo: number
    diff: number
  }> = []
  let errors = 0

  for (const b of active) {
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
      if (Math.abs(newPrice - currentPrice) < 1) continue

      rows.push({
        id: b.id,
        fecha: b.startTime.toISOString(),
        tipo: b.coach ? `CLASE (${b.coach.name})` : "RESERVA COMÚN",
        cancha: b.court.name,
        precioActual: currentPrice,
        precioNuevo: newPrice,
        diff: newPrice - currentPrice,
      })

      if (apply) {
        await prisma.courtBooking.update({ where: { id: b.id }, data: { price: newPrice } })
      }
    } catch (e) {
      errors++
      console.error(`Error booking ${b.id}:`, e)
    }
  }

  return NextResponse.json({
    mode: apply ? "APPLIED" : "PREVIEW",
    totalChecked: active.length,
    changed: rows.length,
    errors,
    rows,
  })
}
