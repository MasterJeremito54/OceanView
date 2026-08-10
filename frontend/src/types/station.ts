// Duplicado a mano de los tipos del backend (src/ingestion/types.ts +
// schema.prisma) — a esta escala, sin monorepo, es más simple mantener
// esto sincronizado manualmente que configurar un paquete compartido.

export interface Reading {
  id: string;
  stationId: string;
  timestamp: string; // ISO 8601, UTC
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
  qualityFlag: "valid" | "suspect";
  createdAt: string;
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  active: boolean;
  lastSeenAt: string | null;
  latestReading: Reading | null;
}

export interface StationDetail extends Station {
  consecutiveFailures: number;
}

export interface ReadingsResponse {
  stationId: string;
  range: string;
  since: string;
  count: number;
  readings: Reading[];
}
