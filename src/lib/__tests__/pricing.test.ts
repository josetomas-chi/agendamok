import { describe, it, expect } from "vitest"
import { calcCourtPrice, getCourtBookingPrice } from "@/lib/pricing"
import { utcToChileLocal, chileLocalToUTC } from "@/lib/timezone"
// ─── Helpers ─────────────────────────────────────────────────────────────────

type Rule = Parameters<typeof calcCourtPrice>[0][number]

function rule(
  days: number[],
  startTime: string,
  endTime: string,
  pricePerHour: number,
  fixedSlots: string[] = [],
): Rule {
  return {
    id: "r1",
    courtId: "c1",
    name: "test",
    days,
    startTime,
    endTime,
    // calcCourtPrice calls Number(rule.price) internally — a plain number works fine
    price: pricePerHour as unknown as Rule["price"],
    fixedSlots,
    paymentPlayers: 1,
  }
}

/** Build a Chile-local Date treated as UTC (pattern used in recurring bookings). */
function chileUTC(y: number, mo: number, d: number, h: number, min = 0): Date {
  return new Date(Date.UTC(y, mo - 1, d, h, min, 0))
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("calcCourtPrice — horario flexible (precio × hora)", () => {
  // Lunes = 1. Tarifa única: 09:00–22:00 a $8.000/hr
  const LUNES = [1]
  const RULES_SINGLE = [rule(LUNES, "09:00", "22:00", 8000)]

  it("(1) 60 min valle — $8.000", () => {
    // Lunes 10:00–11:00 Chile (hora local). Simula el flujo del dashboard.
    // calcCourtPrice recibe Dates construidas con utcToChileLocal invertido:
    // el dashboard convierte "10:00" Chile → UTC antes de guardar.
    // En el test usamos useUTC=true y los timestamps en UTC que representan 10:00–11:00.
    const start = chileUTC(2026, 9, 7, 10, 0) // lunes 10:00 como "local en UTC"
    const end   = chileUTC(2026, 9, 7, 11, 0)
    expect(calcCourtPrice(RULES_SINGLE, start, end, null, true)).toBe(8000)
  })

  it("(2) 90 min cruzando tarifa (valle → pico) — precio proporcional", () => {
    // Dos tarifas: 09:00–13:00 a $8.000/hr  y  13:00–22:00 a $12.000/hr
    const rules = [
      rule(LUNES, "09:00", "13:00", 8000),
      rule(LUNES, "13:00", "22:00", 12000),
    ]
    // 12:30–14:00 = 30 min a $8.000/hr + 60 min a $12.000/hr
    // = (0.5 × 8000) + (1.0 × 12000) = 4000 + 12000 = $16.000
    const start = chileUTC(2026, 9, 7, 12, 30)
    const end   = chileUTC(2026, 9, 7, 14,  0)
    expect(calcCourtPrice(rules, start, end, null, true)).toBe(16000)
  })

  it("(3) 120 min pico — $24.000", () => {
    const rules = [rule(LUNES, "18:00", "22:00", 12000)]
    // 19:00–21:00 = 2 hr × $12.000 = $24.000
    const start = chileUTC(2026, 9, 7, 19, 0)
    const end   = chileUTC(2026, 9, 7, 21, 0)
    expect(calcCourtPrice(rules, start, end, null, true)).toBe(24000)
  })

  it("(4) feriado con recargo porcentual del 20% — precio escalado", () => {
    // Base: 60 min a $10.000/hr = $10.000. +20% = $12.000
    const rules  = [rule(LUNES, "09:00", "22:00", 10000)]
    const holiday = { surchargeType: "PERCENT", surchargeValue: 20 }
    const start  = chileUTC(2026, 9, 7, 10, 0)
    const end    = chileUTC(2026, 9, 7, 11, 0)
    expect(calcCourtPrice(rules, start, end, holiday, true)).toBe(12000)
  })

  it("(5) feriado con recargo fijo — suma constante", () => {
    // Base: 60 min a $10.000/hr = $10.000. +$3.000 fijo = $13.000
    const rules  = [rule(LUNES, "09:00", "22:00", 10000)]
    const holiday = { surchargeType: "FIXED", surchargeValue: 3000 }
    const start  = chileUTC(2026, 9, 7, 10, 0)
    const end    = chileUTC(2026, 9, 7, 11, 0)
    expect(calcCourtPrice(rules, start, end, holiday, true)).toBe(13000)
  })
})

describe("calcCourtPrice — bloques fijos (precio por bloque, no por hora)", () => {
  const LUNES = [1]

  it("precio fijo independiente de la duración del slot", () => {
    // fixedSlots: ["10:00","11:30"]. precio=$9.000 por bloque.
    // 90 min pero el precio NO se multiplica por horas — es $9.000 fijo.
    const rules = [rule(LUNES, "10:00", "12:00", 9000, ["10:00", "11:30"])]
    const start = chileUTC(2026, 9, 7, 10, 0)
    const end   = chileUTC(2026, 9, 7, 11, 30)
    expect(calcCourtPrice(rules, start, end, null, true)).toBe(9000)
  })
})

describe("getCourtBookingPrice — validación pública (sin UTC)", () => {
  const LUNES = [1] // 2026-09-07 es lunes

  it("60 min sin bloques fijos — precio por hora", () => {
    const rules = [rule(LUNES, "09:00", "22:00", 8000)]
    const { price, error } = getCourtBookingPrice(rules, "2026-09-07", "10:00", 60)
    expect(error).toBeUndefined()
    expect(price).toBe(8000)
  })

  it("90 min cruzando tarifa pública", () => {
    const rules = [
      rule(LUNES, "09:00", "13:00", 8000),
      rule(LUNES, "13:00", "22:00", 12000),
    ]
    const { price } = getCourtBookingPrice(rules, "2026-09-07", "12:30", 90)
    expect(price).toBe(16000)
  })

  it("fuera de horario — retorna precio 0 sin error fatal", () => {
    const rules = [rule(LUNES, "09:00", "13:00", 8000)]
    const { price } = getCourtBookingPrice(rules, "2026-09-07", "07:00", 60)
    expect(price).toBe(0)
  })
})

describe("utcToChileLocal — conversión de zona horaria", () => {
  it("UTC 12:00 → Chile local (verano UTC-3 → 09:00, invierno UTC-4 → 08:00)", () => {
    // Julio 2026 = invierno Chile = UTC-4
    const utcDate = new Date("2026-07-15T12:00:00Z")
    const chile = utcToChileLocal(utcDate)
    expect(chile.getUTCHours()).toBe(8) // 12 - 4 = 08
  })

  it("UTC 16:00 → Chile local invierno → 12:00", () => {
    const utcDate = new Date("2026-07-15T16:00:00Z")
    const chile = utcToChileLocal(utcDate)
    expect(chile.getUTCHours()).toBe(12)
  })

  it("UTC 16:00 → Chile local verano (enero, UTC-3) → 13:00", () => {
    const utcDate = new Date("2026-01-15T16:00:00Z")
    const chile = utcToChileLocal(utcDate)
    expect(chile.getUTCHours()).toBe(13) // 16 - 3 = 13
  })

  it("chileLocalToUTC es la inversa de utcToChileLocal", () => {
    const original = new Date("2026-07-15T12:00:00Z")
    const local = utcToChileLocal(original)
    const back  = chileLocalToUTC(local)
    // Deben ser iguales en ms (±1s de margen por redondeo)
    expect(Math.abs(back.getTime() - original.getTime())).toBeLessThan(1000)
  })
})
