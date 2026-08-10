import { describe, it, expect } from "vitest";
import { validateReading } from "../src/ingestion/validator";
import type { ParsedReading } from "../src/ingestion/types";

function baseReading(overrides: Partial<ParsedReading> = {}): ParsedReading {
  return {
    stationId: "44013",
    timestamp: new Date("2026-08-10T01:50:00.000Z"),
    windDirDeg: 80,
    windSpeedMs: 7,
    gustMs: 8,
    waveHeightM: 1.1,
    dominantWavePeriodS: 8,
    avgWavePeriodS: 4.6,
    waveDirDeg: 121,
    pressureHpa: 1015,
    airTempC: 29.2,
    waterTempC: 27,
    dewPointC: 26.1,
    visibilityNmi: null,
    pressureTendencyHpa: null,
    tideFt: null,
    ...overrides,
  };
}

describe("validateReading", () => {
  it("marca como válida una lectura dentro de rangos físicos normales", () => {
    const result = validateReading(baseReading());
    expect(result.flag).toBe("valid");
    expect(result.reasons).toEqual([]);
  });

  it("no marca como sospechosos los campos en null (dato faltante ≠ dato inválido)", () => {
    const result = validateReading(
      baseReading({ waterTempC: null, waveHeightM: null })
    );
    expect(result.flag).toBe("valid");
  });

  it("marca como sospechosa una temperatura del agua fuera de rango", () => {
    const result = validateReading(baseReading({ waterTempC: 85 }));
    expect(result.flag).toBe("suspect");
    expect(result.reasons.some((r) => r.includes("waterTempC"))).toBe(true);
  });

  it("marca como sospechosa una altura de ola negativa (imposible físicamente)", () => {
    const result = validateReading(baseReading({ waveHeightM: -1 }));
    expect(result.flag).toBe("suspect");
  });

  it("marca como sospechosa una velocidad de viento absurda", () => {
    const result = validateReading(baseReading({ windSpeedMs: 500 }));
    expect(result.flag).toBe("suspect");
  });

  it("acumula varias razones si hay más de un campo fuera de rango", () => {
    const result = validateReading(
      baseReading({ waterTempC: 85, windSpeedMs: 500 })
    );
    expect(result.reasons.length).toBe(2);
  });
});
