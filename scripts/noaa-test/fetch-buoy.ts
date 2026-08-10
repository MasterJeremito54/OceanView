// scripts/noaa-test/fetch-buoy.ts
//
// Fase 0.5 de OceanView: descarga el archivo .txt de una boya NDBC,
// extrae la lectura mas reciente y la imprime en consola.
// Sin base de datos, sin servidor - solo valida que la fuente de datos funciona.
//
// Uso:
//   npx ts-node fetch-buoy.ts 42057
//   npm run fetch -- 42057
//
// Si no se pasa un ID, usa la primera boya de stations.json.

import stations from "./stations.json";

const stationArg = process.argv[2];
const knownStation = stations.find((s) => s.id === stationArg);
const STATION_ID = stationArg ?? stations[0].id;
const STATION_NAME = knownStation?.name ?? stationArg ? undefined : stations[0].name;

const URL = `https://www.ndbc.noaa.gov/data/realtime2/${STATION_ID}.txt`;

// Orden de columnas del formato estandar NDBC (stdmet / realtime2/{ID}.txt)
const COLUMNS = [
  "YY", "MM", "DD", "hh", "mm",
  "WDIR", "WSPD", "GST", "WVHT", "DPD", "APD", "MWD",
  "PRES", "ATMP", "WTMP", "DEWP", "VIS", "PTDY", "TIDE",
];

interface Reading {
  timestamp: string;
  windDirDeg: number | null;
  windSpeedMs: number | null;
  waveHeightM: number | null;
  waterTempC: number | null;
}

function parseValue(raw: string | undefined): number | null {
  // NDBC usa "MM" para indicar dato faltante
  if (raw === undefined || raw === "MM") return null;
  const value = parseFloat(raw);
  return Number.isNaN(value) ? null : value;
}

function msToKmh(ms: number | null): number | null {
  return ms === null ? null : Math.round(ms * 3.6 * 10) / 10;
}

async function fetchLatestReading(stationId: string): Promise<Reading> {
  const response = await fetch(URL);
  if (!response.ok) {
    throw new Error(
      `No se pudo descargar datos de la boya ${stationId} (HTTP ${response.status})`
    );
  }

  const text = await response.text();
  const lines = text.trim().split("\n");

  // Las primeras 2 lineas son cabeceras (#YY MM DD... / #yr mo dy...)
  // La primera linea de datos (linea 3) es la lectura MAS RECIENTE
  const dataLines = lines.slice(2);
  if (dataLines.length === 0) {
    throw new Error(`La boya ${stationId} no tiene datos disponibles ahora mismo`);
  }

  const fields = dataLines[0].trim().split(/\s+/);
  const row: Record<string, string> = {};
  COLUMNS.forEach((col, i) => {
    row[col] = fields[i];
  });

  const timestamp = `${row.YY}-${row.MM}-${row.DD} ${row.hh}:${row.mm} UTC`;

  return {
    timestamp,
    windDirDeg: parseValue(row.WDIR),
    windSpeedMs: parseValue(row.WSPD),
    waveHeightM: parseValue(row.WVHT),
    waterTempC: parseValue(row.WTMP),
  };
}

function formatValue(value: number | null, unit: string): string {
  return value === null ? "sin dato" : `${value}${unit}`;
}

async function main() {
  const label = STATION_NAME ? `${STATION_ID} (${STATION_NAME})` : STATION_ID;

  try {
    const reading = await fetchLatestReading(STATION_ID);
    const windKmh = msToKmh(reading.windSpeedMs);

    console.log(
      `Boya ${STATION_ID} (${reading.timestamp}) - ` +
        `Temperatura: ${formatValue(reading.waterTempC, "°C")} | ` +
        `Ola: ${formatValue(reading.waveHeightM, " m")} | ` +
        `Viento: ${formatValue(windKmh, " km/h")}`
    );
  } catch (err) {
    console.error(`Error al obtener datos de la boya ${label}:`, err);
    process.exitCode = 1;
  }
}

main();
