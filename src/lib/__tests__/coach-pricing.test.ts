import { describe, it, expect } from "vitest"
import { calcCoachBookingPrice, calcCoachSettlement, type CoachPricingInput } from "../pricing"

// Chile-local time bakeada como UTC (igual que lo que devuelve utcToChileLocal en el servidor)
function chileDate(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00.000Z`)
}

// Coach de tipo COMMISSION con reglas simples
const coachComision: CoachPricingInput = {
  paymentType: "COMMISSION",
  commissionPercent: 60,
  feeRules: [
    { days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "19:00", classPrice: 20000, price: 0 },
    { days: [1, 2, 3, 4, 5], startTime: "19:00", endTime: "22:00", classPrice: 25000, price: 0 },
    { days: [6],             startTime: "08:00", endTime: "17:00", classPrice: 22000, price: 0 },
  ],
}

// Coach de tipo COURT_FEE (paga arriendo al club)
const coachArriendo: CoachPricingInput = {
  paymentType: "COURT_FEE",
  commissionPercent: null,
  feeRules: [
    { days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "19:00", classPrice: 20000, price: 5000 },
    { days: [1, 2, 3, 4, 5], startTime: "19:00", endTime: "22:00", classPrice: 20000, price: 15000 },
    { days: [6],             startTime: "08:00", endTime: "11:00", classPrice: 20000, price: 7000 },
    { days: [6],             startTime: "11:00", endTime: "18:00", classPrice: 20000, price: 5000 },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// calcCoachBookingPrice — precio a guardar en CourtBooking
// ─────────────────────────────────────────────────────────────────────────────
describe("calcCoachBookingPrice — COMMISSION", () => {
  it("1h en horario valle → classPrice × 1", () => {
    const start = chileDate("2026-11-23", "10:00") // lunes
    const end   = chileDate("2026-11-23", "11:00")
    expect(calcCoachBookingPrice(coachComision, start, end)).toBe(20000)
  })

  it("1.5h en horario valle → classPrice × 1.5", () => {
    const start = chileDate("2026-11-23", "10:00")
    const end   = chileDate("2026-11-23", "11:30")
    expect(calcCoachBookingPrice(coachComision, start, end)).toBe(30000)
  })

  it("1h en horario punta → usa la tarifa correcta", () => {
    const start = chileDate("2026-11-23", "19:00")
    const end   = chileDate("2026-11-23", "20:00")
    expect(calcCoachBookingPrice(coachComision, start, end)).toBe(25000)
  })

  it("sábado → usa regla de sábado", () => {
    const start = chileDate("2026-11-21", "09:00") // sábado = día 6
    const end   = chileDate("2026-11-21", "10:00")
    expect(calcCoachBookingPrice(coachComision, start, end)).toBe(22000)
  })

  it("domingo sin regla → $0", () => {
    const start = chileDate("2026-11-22", "10:00") // domingo = día 0
    const end   = chileDate("2026-11-22", "11:00")
    expect(calcCoachBookingPrice(coachComision, start, end)).toBe(0)
  })

  it("COMMISSION guarda classPrice (no rule.price)", () => {
    // Para COMMISSION, el precio guardado debe ser classPrice (lo que cobra al alumno),
    // no rule.price (que sería el arriendo al club)
    const start = chileDate("2026-11-23", "10:00")
    const end   = chileDate("2026-11-23", "11:00")
    const coachConArriendo = { ...coachComision, paymentType: "COMMISSION" as const }
    // classPrice = 20000, price = 0 → debe devolver 20000
    expect(calcCoachBookingPrice(coachConArriendo, start, end)).toBe(20000)
  })
})

describe("calcCoachBookingPrice — COURT_FEE", () => {
  it("1h en horario valle → rule.price × 1 (no classPrice)", () => {
    const start = chileDate("2026-11-23", "10:00") // lunes, valle
    const end   = chileDate("2026-11-23", "11:00")
    // rule.price = 5000, classPrice = 20000 → debe devolver 5000 (arriendo al club)
    expect(calcCoachBookingPrice(coachArriendo, start, end)).toBe(5000)
  })

  it("1.5h en horario punta → rule.price × 1.5", () => {
    const start = chileDate("2026-11-23", "19:00")
    const end   = chileDate("2026-11-23", "20:30")
    expect(calcCoachBookingPrice(coachArriendo, start, end)).toBe(22500)
  })

  it("sábado horario punta (08:00-11:00) → tarifa correcta", () => {
    const start = chileDate("2026-11-21", "09:00") // sábado
    const end   = chileDate("2026-11-21", "10:00")
    expect(calcCoachBookingPrice(coachArriendo, start, end)).toBe(7000)
  })

  it("COURT_FEE no usa classPrice", () => {
    // Si feeRule.classPrice = 20000 y feeRule.price = 5000, debe devolver 5000
    const start = chileDate("2026-11-23", "10:00")
    const end   = chileDate("2026-11-23", "11:00")
    const result = calcCoachBookingPrice(coachArriendo, start, end)
    expect(result).not.toBe(20000) // no debe ser classPrice
    expect(result).toBe(5000)      // debe ser price (arriendo)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calcCoachSettlement — liquidación de sesión completada
// ─────────────────────────────────────────────────────────────────────────────
describe("calcCoachSettlement — COMMISSION", () => {
  it("coach 60% sobre $20.000 → gana $12.000, club $8.000", () => {
    const start = chileDate("2026-11-23", "10:00")
    const end   = chileDate("2026-11-23", "11:00")
    const { coachEarns, coachPays, clubEarns } = calcCoachSettlement(coachComision, 20000, start, end)
    expect(coachEarns).toBe(12000)
    expect(coachPays).toBe(0)
    expect(clubEarns).toBe(8000)
  })

  it("coachEarns + clubEarns === bookingPrice siempre", () => {
    const start = chileDate("2026-11-23", "10:00")
    const end   = chileDate("2026-11-23", "11:30")
    const bookingPrice = 30000
    const { coachEarns, clubEarns } = calcCoachSettlement(coachComision, bookingPrice, start, end)
    expect(coachEarns + clubEarns).toBe(bookingPrice)
  })

  it("sin commissionPercent (null) → coach gana $0, club se queda todo", () => {
    const coach: CoachPricingInput = { paymentType: "COMMISSION", commissionPercent: null, feeRules: [] }
    const { coachEarns, clubEarns } = calcCoachSettlement(coach, 20000, new Date(), new Date())
    expect(coachEarns).toBe(0)
    expect(clubEarns).toBe(20000)
  })
})

describe("calcCoachSettlement — COURT_FEE", () => {
  it("1h en valle: clase $20.000, arriendo $5.000 → club $5.000, coach $15.000", () => {
    const start = chileDate("2026-11-23", "10:00") // lunes valle
    const end   = chileDate("2026-11-23", "11:00")
    const bookingPrice = 20000 // lo que cobró al alumno
    const { coachEarns, coachPays, clubEarns } = calcCoachSettlement(coachArriendo, bookingPrice, start, end)
    expect(coachPays).toBe(5000)
    expect(clubEarns).toBe(5000)
    expect(coachEarns).toBe(15000)
  })

  it("1h en punta: clase $20.000, arriendo $15.000 → club $15.000, coach $5.000", () => {
    const start = chileDate("2026-11-23", "19:00")
    const end   = chileDate("2026-11-23", "20:00")
    const bookingPrice = 20000
    const { coachEarns, coachPays, clubEarns } = calcCoachSettlement(coachArriendo, bookingPrice, start, end)
    expect(coachPays).toBe(15000)
    expect(clubEarns).toBe(15000)
    expect(coachEarns).toBe(5000)
  })

  it("sin regla para ese horario → coach no paga arriendo", () => {
    const start = chileDate("2026-11-22", "10:00") // domingo, sin regla
    const end   = chileDate("2026-11-22", "11:00")
    const { coachPays, clubEarns, coachEarns } = calcCoachSettlement(coachArriendo, 20000, start, end)
    expect(coachPays).toBe(0)
    expect(clubEarns).toBe(0)
    expect(coachEarns).toBe(20000)
  })

  it("coachPays === clubEarns siempre en COURT_FEE", () => {
    const start = chileDate("2026-11-23", "10:00")
    const end   = chileDate("2026-11-23", "11:30")
    const { coachPays, clubEarns } = calcCoachSettlement(coachArriendo, 30000, start, end)
    expect(coachPays).toBe(clubEarns)
  })
})
