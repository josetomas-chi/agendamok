import { tzOffset } from "@date-fns/tz"

const TZ = "America/Santiago"

/**
 * Returns offset in ms for America/Santiago on the given date.
 * tzOffset returns a negative value for west-of-UTC timezones (e.g. -14400000 for UTC-4).
 */
function getOffsetMs(date: Date): number {
  return tzOffset(TZ, date)
}

/**
 * Convert a "local clock time" Date (constructed as if UTC) to a true UTC Date.
 * e.g. schedule says "09:00" Chile → call chileLocalToUTC(new Date set to 09:00 UTC) → 13:00 UTC in winter
 */
export function chileLocalToUTC(date: Date): Date {
  const offset = getOffsetMs(date) // negative for west-of-UTC
  return new Date(date.getTime() - offset)
}

/**
 * Convert a UTC Date to a "local clock" Date so we can format it as Chile time.
 * e.g. 13:00 UTC → 09:00 Chile in winter
 */
export function utcToChileLocal(date: Date): Date {
  const offset = getOffsetMs(date)
  return new Date(date.getTime() + offset)
}
