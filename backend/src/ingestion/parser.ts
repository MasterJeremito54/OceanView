import type { ParsedReading } from "./types";

// Orden de columnas del formato estándar NDBC (stdmet / realtime2/{ID}.txt).
// Confirmado contra archivos reales en la Fase 0.5 — no todas las boyas
// reportan todas las columnas con datos, pero el orden es consistente.
const COLUMNS = [
  "YY",
  "MM",
  "DD",
  "hh",
  "mm",
  "WDIR",
  "WSPD",
  "GST",
  "WVHT",
  "DPD",
  "APD",
  "MWD",
  "PRES",
  "ATMP",
  "WTMP",
  "DEWP",
  "VIS",
  "PTDY",
  "TIDE",
] as const;

function parseValue(raw: string | undefined): number | null {
  // NDBC usa "MM" para dato faltante. Nunca asumir que undefined/"MM" es 0:
  // 0.0 es un valor real (ej. viento en calma), null es "no sabemos".
  if (raw === undefined || raw === "MM") return null;
  const value = parseFloat(raw);
  return Number.isNaN(value) ? null : value;
}

/**
 * Parsea el archivo completo de una boya en un arreglo de lecturas,
 * de la más reciente a la más antigua (así es como NDBC ordena el archivo).
 */
export function parseStationText(
  stationId: string,
  text: string
): ParsedReading[] {
  const lines = text.trim().split("\n");
  // Las primeras 2 líneas son cabeceras (#YY MM DD... / #yr mo dy...)
  const dataLines = lines.slice(2);

  return dataLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const fields = line.split(/\s+/);
      const row: Record<string, string> = {};
      COLUMNS.forEach((col, i) => {
        row[col] = fields[i];
      });

      const timestamp = new Date(
        Date.UTC(
          Number(row.YY),
          Number(row.MM) - 1, // Date usa meses 0-indexados
          Number(row.DD),
          Number(row.hh),
          Number(row.mm)
        )
      );

      const reading: ParsedReading = {
        stationId,
        timestamp,
        windDirDeg: parseValue(row.WDIR),
        windSpeedMs: parseValue(row.WSPD),
        gustMs: parseValue(row.GST),
        waveHeightM: parseValue(row.WVHT),
        dominantWavePeriodS: parseValue(row.DPD),
        avgWavePeriodS: parseValue(row.APD),
        waveDirDeg: parseValue(row.MWD),
        pressureHpa: parseValue(row.PRES),
        airTempC: parseValue(row.ATMP),
        waterTempC: parseValue(row.WTMP),
        dewPointC: parseValue(row.DEWP),
        visibilityNmi: parseValue(row.VIS),
        pressureTendencyHpa: parseValue(row.PTDY),
        tideFt: parseValue(row.TIDE),
      };

      return reading;
    });
}

/** Devuelve solo la lectura más reciente, o null si el archivo está vacío. */
export function parseLatestReading(
  stationId: string,
  text: string
): ParsedReading | null {
  const readings = parseStationText(stationId, text);
  return readings[0] ?? null;
}
