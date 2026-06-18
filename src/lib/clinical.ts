export const HEALTH_CATEGORIES = [
  "Kinesiología", "Psicología", "Nutrición", "Odontología",
  "Medicina General", "Fisioterapia", "Quiropraxia",
  "Fonoaudiología", "Dermatología", "Masajes",
]

export function isClinicalCategory(category: string) {
  return HEALTH_CATEGORIES.some(c => c.toLowerCase() === category.toLowerCase())
}
