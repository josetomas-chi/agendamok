import type { CourtPricingRule } from "@prisma/client"

type Holiday = {
  surchargeType: string | null
  surchargeValue: number | null
}

/**
 * Calcula el precio de una reserva de cancha según sus reglas de tarifa.
 * - Con fixedSlots: precio fijo por bloque (no depende de la duración)
 * - Sin fixedSlots: precio por hora × duración
 * - Con feriado tipo SURCHARGE: aplica recargo porcentual o fijo encima del precio base
 *
 * @param useUTC  true cuando start/end se construyeron con Date.UTC (ej: reservas recurrentes)
 */
export function calcCourtPrice(
  pricingRules: CourtPricingRule[],
  start: Date,
  end: Date,
  holiday?: Holiday | null,
  useUTC = false,
): number {
  const getHours   = useUTC ? (d: Date) => d.getUTCHours()   : (d: Date) => d.getHours()
  const getMinutes = useUTC ? (d: Date) => d.getUTCMinutes() : (d: Date) => d.getMinutes()
  const getDay     = useUTC ? (d: Date) => d.getUTCDay()     : (d: Date) => d.getDay()

  const dayOfWeek   = getDay(start)
  const timeStr     = `${String(getHours(start)).padStart(2, "0")}:${String(getMinutes(start)).padStart(2, "0")}`
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  let price = 0
  for (const rule of pricingRules) {
    if (rule.days.includes(dayOfWeek) && timeStr >= rule.startTime && timeStr < rule.endTime) {
      price = rule.fixedSlots.length ? Number(rule.price) : Number(rule.price) * durationHours
      break
    }
  }

  if (holiday?.surchargeValue) {
    if (holiday.surchargeType === "PERCENT") price = price * (1 + holiday.surchargeValue / 100)
    else if (holiday.surchargeType === "FIXED") price = price + holiday.surchargeValue
  }

  return price
}
