// Lowercases and strips diacritics so "Tomás" matches a search for "tomas".
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}
