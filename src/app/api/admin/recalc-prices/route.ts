import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calcCourtPrice, calcCoachBookingPrice } from "@/lib/pricing"
import { utcToChileLocal } from "@/lib/timezone"

const ADMIN_EMAIL = "josetomas@bullpadel.cl"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.email !== ADMIN_EMAIL)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const apply = new URL(req.url).searchParams.get("apply") === "true"

  const bookings = await prisma.courtBooking.findMany({
    where: { deletedAt: null },
    include: {
      court: { include: { pricingRules: true } },
      coach: { include: { feeRules: true } },
    },
  })

  const candidates = bookings.filter(b => ["CONFIRMED", "PENDING"].includes(b.status))

  const rows: Array<{
    id: string; fecha: string; tipo: string
    precioActual: number; precioNuevo: number; diff: number
  }> = []

  for (const b of candidates) {
    try {
      const startChile = utcToChileLocal(b.startTime)
      const endChile   = utcToChileLocal(b.endTime)

      const newPrice = b.coach
        ? calcCoachBookingPrice(b.coach as Parameters<typeof calcCoachBookingPrice>[0], startChile, endChile)
        : calcCourtPrice(b.court.pricingRules, startChile, endChile)

      const currentPrice = Number(b.price)
      const diff = newPrice - currentPrice
      if (Math.abs(diff) < 1) continue

      rows.push({
        id: b.id,
        fecha: startChile.toISOString().slice(0, 16).replace("T", " "),
        tipo: b.coach ? `CLASE (${b.coach.name})` : "CANCHA",
        precioActual: currentPrice,
        precioNuevo: newPrice,
        diff,
      })

      if (apply) {
        await prisma.courtBooking.update({ where: { id: b.id }, data: { price: newPrice } })
      }
    } catch {}
  }

  return NextResponse.json({ mode: apply ? "APPLIED" : "PREVIEW", changed: rows.length, rows })
}
