/**
 * Convierte un string tipo "24h" o "48h" en un número de horas.
 * Devuelve null si el formato no es válido o el rango es absurdo
 * (0, negativo, o más de 30 días) — la ruta que lo use debe responder
 * 400 en ese caso, no adivinar un valor por defecto silenciosamente.
 */
export function parseRangeToHours(range: string): number | null {
  const match = /^(\d+)h$/.exec(range);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 30) return null;

  return hours;
}
