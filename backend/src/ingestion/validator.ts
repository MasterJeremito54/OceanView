import type { ParsedReading } from "./types";

export type QualityFlag = "valid" | "suspect";

interface Range {
  min: number;
  max: number;
}

// Rangos físicos plausibles, definidos con datos reales como referencia
// (Fase 0.5). No son límites estrictos de "lo que puede pasar en el
// océano" — son un filtro barato contra errores de sensor obvios
// (ej. un -999 que se coló, un typo de unidad).
const RANGES: Partial<Record<keyof ParsedReading, Range>> = {
  waterTempC: { min: -2, max: 40 },
  airTempC: { min: -60, max: 60 },
  waveHeightM: { min: 0, max: 20 },
  windSpeedMs: { min: 0, max: 100 },
  gustMs: { min: 0, max: 120 },
  pressureHpa: { min: 850, max: 1100 },
};

export interface ValidationResult {
  flag: QualityFlag;
  reasons: string[];
}

export function validateReading(reading: ParsedReading): ValidationResult {
  const reasons: string[] = [];

  for (const [field, range] of Object.entries(RANGES) as [
    keyof ParsedReading,
    Range
  ][]) {
    const value = reading[field];
    if (
      typeof value === "number" &&
      (value < range.min || value > range.max)
    ) {
      reasons.push(
        `${field}=${value} fuera de rango plausible [${range.min}, ${range.max}]`
      );
    }
  }

  return {
    flag: reasons.length > 0 ? "suspect" : "valid",
    reasons,
  };
}
