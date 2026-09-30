/**
 * Devuelve la fecha calendario (YYYY-MM-DD) en la zona horaria local.
 * Ojo: `toISOString().slice(0, 10)` da el día en UTC, que a la noche en
 * Argentina (UTC-3) ya es el día siguiente.
 */
export function toLocalDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
