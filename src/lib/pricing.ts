import type { CourtPricingRule } from "@prisma/client"

// ─── Coach types ──────────────────────────────────────────────────────────────

export type CoachFeeRule = {
  days: number[]
  startTime: string  // "HH:mm"
  endTime: string    // "HH:mm"
  classPrice: number // lo que cobra el profe al alumno por hora
  price: number      // arriendo que paga el profe al club por hora (COURT_FEE)
}

export type CoachPricingInput = {
  paymentType: "COMMISSION" | "COURT_FEE"
  commissionPercent?: number | null
  feeRules: CoachFeeRule[]
}

/**
 * Calcula el precio a guardar en CourtBooking cuando hay coach.
 * - COMMISSION: se guarda classPrice × horas (precio al alumno del que el club toma su %)
 * - COURT_FEE:  se guarda rule.price × horas (arriendo fijo al club)
 * Recibe fechas con la hora chilena bakeada como UTC (resultado de utcToChileLocal).
 */
export function calcCoachBookingPrice(
  coach: CoachPricingInput,
  start: Date,
  end: Date,
): number {
  return segmentCoachPrice(coach, start, end, coach.paymentType === "COURT_FEE" ? "price" : "classPrice")
}

function segmentCoachPrice(
  coach: CoachPricingInput,
  start: Date,
  end: Date,
  field: "price" | "classPrice",
): number {
  let total = 0
  let cursor = new Date(start)
  while (cursor < end) {
    const dow = cursor.getUTCDay()
    const h = String(cursor.getUTCHours()).padStart(2, "0")
    const m = String(cursor.getUTCMinutes()).padStart(2, "0")
    const timeStr = `${h}:${m}`

    const rule = coach.feeRules.find(r =>
      r.days.map(Number).includes(dow) && timeStr >= r.startTime && timeStr < r.endTime
    )
    if (!rule) { cursor = new Date(cursor.getTime() + 60 * 1000); continue }

    // Avanza hasta el fin de la regla o el fin de la reserva
    const [reh, rem] = rule.endTime.split(":").map(Number)
    const ruleEnd = new Date(cursor)
    ruleEnd.setUTCHours(reh, rem, 0, 0)
    const segEnd = ruleEnd < end ? ruleEnd : end
    const segHours = (segEnd.getTime() - cursor.getTime()) / (1000 * 60 * 60)
    total += Number(rule[field]) * segHours
    cursor = segEnd
  }
  return total
}

/**
 * Calcula los montos de liquidación para una sesión completada con coach.
 * - COMMISSION: coach gana su % del precio guardado; club gana el resto
 * - COURT_FEE:  coach paga arriendo al club según regla; coach gana el resto
 * Devuelve coachEarns, coachPays, clubEarns (todos en pesos).
 */
export function calcCoachSettlement(
  coach: CoachPricingInput,
  bookingPrice: number,       // CourtBooking.price ya guardado
  start: Date,                // Chile-local bakeada como UTC
  end: Date,
): { coachEarns: number; coachPays: number; clubEarns: number } {
  if (coach.paymentType === "COMMISSION") {
    const pct = coach.commissionPercent ?? 0
    const coachEarns = bookingPrice * (pct / 100)
    return { coachEarns, coachPays: 0, clubEarns: bookingPrice - coachEarns }
  }

  // COURT_FEE: arriendo = segmentación por reglas
  const coachPays = segmentCoachPrice(coach, start, end, "price")
  return { coachEarns: bookingPrice - coachPays, coachPays, clubEarns: coachPays }
}

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

  // Para fixedSlots: validar con la regla del inicio (slots discretos, no se cruzan tarifas)
  const startRule = pricingRules.find(r =>
    r.days.includes(dayOfWeek) && timeStr >= r.startTime && timeStr < r.endTime,
  )
  if (!startRule) return { price: 0 }

  if (startRule.fixedSlots.length) {
    if (!startRule.fixedSlots.includes(timeStr))
      return { price: 0, error: "Horario inválido para esta cancha" }
    const idx = startRule.fixedSlots.indexOf(timeStr)
    if (idx < startRule.fixedSlots.length - 1) {
      const [nh, nm] = startRule.fixedSlots[idx + 1].split(":").map(Number)
      const [ch, cm] = timeStr.split(":").map(Number)
      const slotMin = nh * 60 + nm - (ch * 60 + cm)
      if (durationMinutes !== slotMin)
        return { price: 0, error: `La duración debe ser ${slotMin} minutos` }
    } else {
      const [ch, cm] = timeStr.split(":").map(Number)
      const [eh, em] = startRule.endTime.split(":").map(Number)
      const maxDuration = eh * 60 + em - (ch * 60 + cm)
      if (durationMinutes > maxDuration)
        return { price: 0, error: `La duración máxima para este horario es ${maxDuration} minutos` }
    }
    return { price: Number(startRule.price) }
  }

  // Sin fixedSlots: calcular proporcional si la reserva cruza cambio de tarifa
  const [sy, sm, sd] = dateStr.split("-").map(Number)
  const [sh, smin] = timeStr.split(":").map(Number)
  let totalPrice = 0
  let cursor = new Date(sy, sm - 1, sd, sh, smin, 0)
  const endMs = cursor.getTime() + durationMinutes * 60 * 1000
  const endDate = new Date(endMs)
  while (cursor < endDate) {
    const ch = cursor.getHours()
    const cm = cursor.getMinutes()
    const ct = `${String(ch).padStart(2, "0")}:${String(cm).padStart(2, "0")}`
    const rule = pricingRules.find(r => r.days.includes(dayOfWeek) && ct >= r.startTime && ct < r.endTime)
    if (!rule) { cursor = new Date(cursor.getTime() + 60 * 1000); continue }
    const [reh, rem] = rule.endTime.split(":").map(Number)
    const ruleEnd = new Date(new Date(cursor).setHours(reh, rem, 0, 0))
    const segEnd = ruleEnd < endDate ? ruleEnd : endDate
    const segHours = (segEnd.getTime() - cursor.getTime()) / (1000 * 60 * 60)
    totalPrice += Number(rule.price) * segHours
    cursor = segEnd
  }
  return { price: totalPrice }
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
  useUTC = true,
): number {
  const getHours   = useUTC ? (d: Date) => d.getUTCHours()   : (d: Date) => d.getHours()
  const getMinutes = useUTC ? (d: Date) => d.getUTCMinutes() : (d: Date) => d.getMinutes()
  const getDay     = useUTC ? (d: Date) => d.getUTCDay()     : (d: Date) => d.getDay()

  const dayOfWeek = getDay(start)

  // Calcular precio proporcional si la reserva cruza cambio de tarifa
  let price = 0
  let cursor = new Date(start)
  while (cursor < end) {
    const h = getHours(cursor)
    const m = getMinutes(cursor)
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    const rule = pricingRules.find(r =>
      r.days.includes(dayOfWeek) && timeStr >= r.startTime && timeStr < r.endTime
    )
    if (!rule) { cursor = new Date(cursor.getTime() + 60 * 1000); continue }
    // Fin de esta tarifa o fin de la reserva, lo que sea antes
    const [reh, rem] = rule.endTime.split(":").map(Number)
    const ruleEnd = useUTC
      ? new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), reh, rem, 0))
      : new Date(new Date(cursor).setHours(reh, rem, 0, 0))
    const segEnd = ruleEnd < end ? ruleEnd : end
    const segHours = (segEnd.getTime() - cursor.getTime()) / (1000 * 60 * 60)
    if (rule.fixedSlots.length > 1) {
      const [h0, m0] = rule.fixedSlots[0].split(":").map(Number)
      const [h1, m1] = rule.fixedSlots[1].split(":").map(Number)
      const slotHours = (h1 * 60 + m1 - (h0 * 60 + m0)) / 60
      price += Number(rule.price) * (segHours / slotHours)
    } else {
      price += Number(rule.price) * segHours
    }
    cursor = segEnd
  }

  if (holiday?.surchargeValue) {
    if (holiday.surchargeType === "PERCENT") price = price * (1 + holiday.surchargeValue / 100)
    else if (holiday.surchargeType === "FIXED") price = price + holiday.surchargeValue
  }

  return price
}
