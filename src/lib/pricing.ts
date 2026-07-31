import type { CourtPricingRule } from "@prisma/client"

type Holiday = {
  surchargeType: string | null
  surchargeValue: number | null
}

/**
 * Valida y retorna el precio de un bloque público de cancha.
 * Úsalo en rutas de booking público para evitar divergencia con calcCourtPrice.
 *
 * - fixedSlots: valida que el timeStr esté en la lista y que la duración coincida
 * - sin fixedSlots: precio por hora × (durationMinutes / 60)
 */
export function getCourtBookingPrice(
  pricingRules: Pick<CourtPricingRule, "days" | "startTime" | "endTime" | "price" | "fixedSlots">[],
  dateStr: string,       // "YYYY-MM-DD"
  timeStr: string,       // "HH:MM"
  durationMinutes: number,
): { price: number; error?: string } {
  const [y, m, d] = dateStr.split("-").map(Number)
  const dayOfWeek = new Date(y, m - 1, d).getDay() // 0=Sun … 6=Sat

  const rule = pricingRules.find(r =>
    r.days.includes(dayOfWeek) && timeStr >= r.startTime && timeStr < r.endTime,
  )
  if (!rule) return { price: 0 }

  if (rule.fixedSlots.length) {
    if (!rule.fixedSlots.includes(timeStr))
      return { price: 0, error: "Horario inválido para esta cancha" }
    const idx = rule.fixedSlots.indexOf(timeStr)
    if (idx < rule.fixedSlots.length - 1) {
      const [nh, nm] = rule.fixedSlots[idx + 1].split(":").map(Number)
      const [ch, cm] = timeStr.split(":").map(Number)
      const slotMin = nh * 60 + nm - (ch * 60 + cm)
      if (durationMinutes !== slotMin)
        return { price: 0, error: `La duración debe ser ${slotMin} minutos` }
    } else {
      // Last fixed slot: validate that booking doesn't exceed rule endTime
      const [ch, cm] = timeStr.split(":").map(Number)
      const [eh, em] = rule.endTime.split(":").map(Number)
      const maxDuration = eh * 60 + em - (ch * 60 + cm)
      if (durationMinutes > maxDuration)
        return { price: 0, error: `La duración máxima para este horario es ${maxDuration} minutos` }
    }
    return { price: Number(rule.price) }
  }

  return { price: Number(rule.price) * (durationMinutes / 60) }
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
