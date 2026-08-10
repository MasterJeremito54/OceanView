import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseStationText, parseLatestReading } from "../src/ingestion/parser";

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, "fixtures", name), "utf-8");
}

describe("parseStationText", () => {
  it("parsea todas las filas de datos, ignorando las 2 líneas de cabecera", () => {
    const text = loadFixture("44013.txt");
    const readings = parseStationText("44013", text);
    expect(readings.length).toBe(5);
  });

  it("asigna el stationId correcto a cada lectura", () => {
    const text = loadFixture("42057.txt");
    const readings = parseStationText("42057", text);
    expect(readings.every((r) => r.stationId === "42057")).toBe(true);
  });

  it("la fila más reciente es la primera (NDBC ordena así el archivo)", () => {
    const text = loadFixture("42057.txt");
    const latest = parseLatestReading("42057", text);
    expect(latest?.timestamp.toISOString()).toBe("2026-08-10T01:50:00.000Z");
  });

  it('convierte "MM" en null en vez de romper o devolver NaN', () => {
    const text = loadFixture("42057.txt");
    const latest = parseLatestReading("42057", text);
    expect(latest?.waterTempC).toBeNull();
  });

  it('distingue "MM" (dato faltante) de 0.0 (valor real, ej. viento en calma)', () => {
    const text = loadFixture("44013.txt");
    const readings = parseStationText("44013", text);
    const calmRow = readings.find(
      (r) => r.timestamp.toISOString() === "2026-08-06T09:40:00.000Z"
    );

    // WSPD=0.0 es un dato real: no hay viento. Debe parsear a 0, no a null.
    expect(calmRow?.windSpeedMs).toBe(0);
    // WDIR="MM" en esa misma fila: sí debe ser null (no hay dirección
    // reportada aunque la velocidad sea 0).
    expect(calmRow?.windDirDeg).toBeNull();
  });

  it("parsea correctamente un valor numérico con signo (PTDY)", () => {
    const text = loadFixture("42057.txt");
    const readings = parseStationText("42057", text);
    const row = readings.find(
      (r) => r.timestamp.toISOString() === "2026-08-10T01:00:00.000Z"
    );
    expect(row?.pressureTendencyHpa).toBe(1.2); // el archivo dice "+1.2"
  });

  it("convierte el timestamp a UTC correctamente sin importar la zona horaria del entorno", () => {
    const text = loadFixture("44013.txt");
    const readings = parseStationText("44013", text);
    const row = readings.find((r) => r.timestamp.getUTCHours() === 9);
    expect(row?.timestamp.getUTCFullYear()).toBe(2026);
    expect(row?.timestamp.getUTCMonth()).toBe(7); // agosto = índice 7
  });

  it("un archivo vacío después de las cabeceras devuelve un arreglo vacío", () => {
    const emptyText =
      "#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE\n" +
      "#yr  mo dy hr mn degT m/s  m/s     m   sec   sec degT   hPa  degC  degC  degC  nmi  hPa    ft\n";
    const readings = parseStationText("00000", emptyText);
    expect(readings).toEqual([]);
  });
});

describe("parseLatestReading", () => {
  it("devuelve null si no hay filas de datos", () => {
    const emptyText = "# header 1\n# header 2\n";
    expect(parseLatestReading("00000", emptyText)).toBeNull();
  });
});
