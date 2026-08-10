import { describe, it, expect } from "vitest";
import { parseRangeToHours } from "../src/lib/dateRange";

describe("parseRangeToHours", () => {
  it("parsea un rango válido en horas", () => {
    expect(parseRangeToHours("24h")).toBe(24);
    expect(parseRangeToHours("48h")).toBe(48);
    expect(parseRangeToHours("1h")).toBe(1);
  });

  it("rechaza formatos no soportados (por ahora solo se acepta \"Nh\")", () => {
    expect(parseRangeToHours("2d")).toBeNull();
    expect(parseRangeToHours("abc")).toBeNull();
    expect(parseRangeToHours("")).toBeNull();
    expect(parseRangeToHours("24")).toBeNull();
  });

  it("rechaza 0 horas", () => {
    expect(parseRangeToHours("0h")).toBeNull();
  });

  it("rechaza rangos absurdamente grandes (más de 30 días)", () => {
    expect(parseRangeToHours("1000h")).toBeNull();
  });

  it("acepta el límite exacto de 30 días (720h)", () => {
    expect(parseRangeToHours("720h")).toBe(720);
  });
});
