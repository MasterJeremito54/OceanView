// Representa una fila ya parseada del archivo stdmet de NDBC (realtime2/{ID}.txt).
// Todos los campos meteorológicos son `number | null`: null significa que
// NDBC reportó "MM" (missing) en esa columna para esa fila.
export interface ParsedReading {
  stationId: string;
  timestamp: Date; // siempre en UTC

  windDirDeg: number | null;
  windSpeedMs: number | null;
  gustMs: number | null;
  waveHeightM: number | null;
  dominantWavePeriodS: number | null;
  avgWavePeriodS: number | null;
  waveDirDeg: number | null;
  pressureHpa: number | null;
  airTempC: number | null;
  waterTempC: number | null;
  dewPointC: number | null;
  visibilityNmi: number | null;
  pressureTendencyHpa: number | null;
  tideFt: number | null;
}
