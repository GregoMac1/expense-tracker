export const CATEGORIES = [
  'comida',
  'transporte',
  'entretenimiento',
  'servicios',
  'salud',
  'ropa',
  'hogar',
  'educacion',
  'deportes',
  'viajes',
  'tecnologia',
  'regalos',
  'otros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/**
 * Normaliza un string devuelto por el LLM a una categoría válida.
 * Si el valor no matchea nada conocido, cae a 'otros'.
 */
export function normalizeCategory(value: string | null | undefined): Category {
  if (!value) return 'otros';
  const lower = value.toLowerCase().trim();
  if (isCategory(lower)) return lower;
  return 'otros';
}
