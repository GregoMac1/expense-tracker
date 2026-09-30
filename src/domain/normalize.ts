/**
 * Normaliza un nombre para matching:
 * - lowercase
 * - sin tildes / diacríticos
 * - trim y colapso de espacios múltiples
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
