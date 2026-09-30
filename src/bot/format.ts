export function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString('es-AR')}`;
}

export function formatUsd(amount: number | null): string | null {
  if (amount === null) return null;
  return `USD ${amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string): string {
  // Acepta YYYY-MM-DD o ISO completo; devuelve YYYY-MM-DD.
  return iso.slice(0, 10);
}
