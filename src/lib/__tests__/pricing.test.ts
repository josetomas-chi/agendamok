import { describe, it, expect } from "vitest"
import { calcCourtPrice, getCourtBookingPrice } from "../pricing"

// Helper to build a fake CourtPricingRule (matches Prisma shape)
function rule(overrides: {
  days: number[]
  startTime: string
  endTime: string
  price: number
  fixedSlots?: string[]
  id?: string
  courtId?: string
  name?: string
  createdAt?: Date
  updatedAt?: Date
}) {
  return {
    id: "r1",
    courtId: "c1",
    name: "Tarifa",
    createdAt: new Date(),
    updatedAt: new Date(),
    fixedSlots: [] as string[],
    ...overrides,
    price: overrides.price as unknown as import("@prisma/client").Prisma.Decimal,
  }
}

// Helper: build a Date that represents a Chile-local time baked as if UTC
// (matches what utcToChileLocal returns — hours are Chile hours when getHours() called on UTC server)
function chileDate(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00.000Z`)
}

// ─────────────────────────────────────────────────────────────────────────────
// calcCourtPrice — sin fixedSlots (precio por hora)
// ─────────────────────────────────────────────────────────────────────────────
describe("calcCourtPrice — sin fixedSlots", () => {
  it("reserva de 1h completa dentro de una tarifa", () => {
    const rules = [rule({ days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "22:00", price: 20000 })]
    const start = chileDate("2026-11-23", "19:00") // lunes
    const end   = chileDate("2026-11-23", "20:00")
    expect(calcCourtPrice(rules, start, end)).toBe(20000)
  })

  it("reserva de 1.5h — debe ser precio × 1.5", () => {
    const rules = [rule({ days: [1, 2, 3, 4, 5], startTime: "08:00", endTime: "22:00", price: 20000 })]
    const start = chileDate("2026-11-23", "19:00")
    const end   = chileDate("2026-11-23", "20:30")
    expect(calcCourtPrice(rules, start, end)).toBe(30000)
  })

  it("reserva que cruza dos tarifas distintas", () => {
    // Valle 08–19 a $10.000/hr, Punta 19–22 a $20.000/hr
    const rules = [
      rule({ days: [1], startTime: "08:00", endTime: "19:00", price: 10000 }),
      rule({ days: [1], startTime: "19:00", endTime: "22:00", price: 20000 }),
    ]
    const start = chileDate("2026-11-23", "18:00")
    const end   = chileDate("2026-11-23", "20:00")
    // 1h a $10.000 + 1h a $20.000 = $30.000
    expect(calcCourtPrice(rules, start, end)).toBe(30000)
  })

  it("reserva de 30 min que cruza dos tarifas", () => {
    const rules = [
      rule({ days: [1], startTime: "08:00", endTime: "19:00", price: 10000 }),
      rule({ days: [1], startTime: "19:00", endTime: "22:00", price: 20000 }),
    ]
    const start = chileDate("2026-11-23", "18:45")
    const end   = chileDate("2026-11-23", "19:15")
    // 15 min a $10.000/hr + 15 min a $20.000/hr = $2.500 + $5.000 = $7.500
    expect(calcCourtPrice(rules, start, end)).toBe(7500)
  })

  it("sin regla que cubra el horario → $0", () => {
    const rules = [rule({ days: [1], startTime: "08:00", endTime: "17:00", price: 10000 })]
    const start = chileDate("2026-11-23", "18:00")
    const end   = chileDate("2026-11-23", "19:00")
    expect(calcCourtPrice(rules, start, end)).toBe(0)
  })

  it("aplica recargo feriado tipo PERCENT", () => {
    const rules = [rule({ days: [1], startTime: "08:00", endTime: "22:00", price: 20000 })]
    const start = chileDate("2026-11-23", "10:00")
    const end   = chileDate("2026-11-23", "11:00")
    const holiday = { surchargeType: "PERCENT", surchargeValue: 50 }
    expect(calcCourtPrice(rules, start, end, holiday)).toBe(30000)
  })

  it("aplica recargo feriado tipo FIXED", () => {
    const rules = [rule({ days: [1], startTime: "08:00", endTime: "22:00", price: 20000 })]
    const start = chileDate("2026-11-23", "10:00")
    const end   = chileDate("2026-11-23", "11:00")
    const holiday = { surchargeType: "FIXED", surchargeValue: 5000 }
    expect(calcCourtPrice(rules, start, end, holiday)).toBe(25000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calcCourtPrice — con fixedSlots (precio por bloque)
// ─────────────────────────────────────────────────────────────────────────────
describe("calcCourtPrice — con fixedSlots", () => {
  it("reserva de exactamente 1 slot → 1× el precio", () => {
    // Slots de 60 min a $20.000
    const rules = [rule({
      days: [1, 2, 3, 4, 5],
      startTime: "08:00", endTime: "22:00",
      price: 20000,
      fixedSlots: ["08:00", "09:00", "10:00", "11:00", "12:00"],
    })]
    const start = chileDate("2026-11-23", "08:00")
    const end   = chileDate("2026-11-23", "09:00")
    expect(calcCourtPrice(rules, start, end)).toBe(20000)
  })

  it("reserva de 1.5h con slots de 60 min → $20.000 × 1.5 = $30.000", () => {
    const rules = [rule({
      days: [1, 2, 3, 4, 5],
      startTime: "08:00", endTime: "22:00",
      price: 20000,
      fixedSlots: ["19:00", "20:00", "21:00", "22:00"],
    })]
    const start = chileDate("2026-11-23", "19:00")
    const end   = chileDate("2026-11-23", "20:30")
    expect(calcCourtPrice(rules, start, end)).toBe(30000)
  })

  it("reserva de 2h con slots de 90 min a $15.000 → $15.000 × (2/1.5) = $20.000", () => {
    // slots de 90 min
    const rules = [rule({
      days: [6], // sábado
      startTime: "08:00", endTime: "17:00",
      price: 15000,
      fixedSlots: ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30", "17:00"],
    })]
    const start = chileDate("2026-11-21", "08:00") // sábado
    const end   = chileDate("2026-11-21", "10:00")
    // 2h / 1.5h por slot = 1.333 slots × $15.000 = $20.000
    expect(calcCourtPrice(rules, start, end)).toBeCloseTo(20000, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCourtBookingPrice — booking público (validación de fixedSlots)
// ─────────────────────────────────────────────────────────────────────────────
describe("getCourtBookingPrice — booking público", () => {
  it("slot exacto sin fixedSlots → precio × horas", () => {
    const rules = [{ days: [1], startTime: "08:00", endTime: "22:00", price: 20000, fixedSlots: [] as string[] }]
    const result = getCourtBookingPrice(rules, "2026-11-23", "19:00", 90)
    expect(result.price).toBe(30000)
    expect(result.error).toBeUndefined()
  })

  it("fixedSlot válido → precio del slot", () => {
    const rules = [{ days: [1], startTime: "08:00", endTime: "22:00", price: 20000, fixedSlots: ["08:00", "09:00", "10:00"] }]
    const result = getCourtBookingPrice(rules, "2026-11-23", "08:00", 60)
    expect(result.price).toBe(20000)
    expect(result.error).toBeUndefined()
  })

  it("horario fuera de fixedSlot → error", () => {
    const rules = [{ days: [1], startTime: "08:00", endTime: "22:00", price: 20000, fixedSlots: ["08:00", "09:00", "10:00"] }]
    const result = getCourtBookingPrice(rules, "2026-11-23", "08:30", 60)
    expect(result.error).toBeDefined()
  })

  it("duración incorrecta para fixedSlot → error", () => {
    const rules = [{ days: [1], startTime: "08:00", endTime: "22:00", price: 20000, fixedSlots: ["08:00", "09:00", "10:00"] }]
    const result = getCourtBookingPrice(rules, "2026-11-23", "08:00", 90) // slot es de 60 min
    expect(result.error).toBeDefined()
  })

  it("sin regla para ese día → price 0", () => {
    const rules = [{ days: [1], startTime: "08:00", endTime: "22:00", price: 20000, fixedSlots: [] as string[] }]
    const result = getCourtBookingPrice(rules, "2026-11-21", "08:00", 60) // sábado = 6
    expect(result.price).toBe(0)
  })
})
