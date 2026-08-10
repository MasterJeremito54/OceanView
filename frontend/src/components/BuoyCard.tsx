import Link from "next/link";
import { Thermometer, Waves, Wind, Navigation } from "lucide-react";
import type { Station } from "@/types/station";
import { LastUpdated, getFreshness, STATUS_COLOR } from "./LastUpdated";

function formatValue(value: number | null | undefined, unit: string, digits = 1): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(digits)}${unit}`;
}

function msToKmh(ms: number | null | undefined): number | null {
  return ms === null || ms === undefined ? null : Math.round(ms * 3.6);
}

export function BuoyCard({ station }: { station: Station }) {
  const reading = station.latestReading;
  const freshness = getFreshness(station.lastSeenAt, station.active);
  const accentColor = STATUS_COLOR[freshness];
  const windKmh = msToKmh(reading?.windSpeedMs);
  const hasWindDir = reading?.windDirDeg !== null && reading?.windDirDeg !== undefined;

  return (
    <Link
      href={`/station/${station.id}`}
      className="group block overflow-hidden rounded-lg border border-panel-border bg-panel transition-colors hover:border-signal-amber/50 hover:bg-panel-hover"
    >
      {/* Barra de acento: el mismo lenguaje de color del punto de pulso,
          pero visible de un vistazo sin tener que leer el texto de estado. */}
      <div className="h-1" style={{ backgroundColor: accentColor }} aria-hidden />

      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-ink">
              {station.name}
            </p>
            <p className="font-mono text-[11px] text-ink-muted">
              {station.latitude.toFixed(2)}°, {station.longitude.toFixed(2)}°
            </p>
          </div>
          <LastUpdated
            lastSeenAt={station.lastSeenAt}
            active={station.active}
            className="shrink-0"
          />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-panel-border pt-3">
          <div>
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-muted">
              <Thermometer size={11} aria-hidden />
              Agua
            </dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {formatValue(reading?.waterTempC, "°C")}
            </dd>
          </div>

          <div>
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-muted">
              <Waves size={11} aria-hidden />
              Oleaje
            </dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {formatValue(reading?.waveHeightM, "m")}
            </dd>
          </div>

          <div>
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-muted">
              <Wind size={11} aria-hidden />
              Viento
            </dt>
            <dd className="mt-1 flex items-center gap-1 font-mono text-lg tabular-nums text-ink">
              {windKmh === null ? (
                "—"
              ) : (
                <>
                  {windKmh}
                  <span className="text-xs text-ink-muted">km/h</span>
                  {hasWindDir && (
                    <Navigation
                      size={12}
                      className="text-ink-muted"
                      style={{ transform: `rotate(${reading!.windDirDeg}deg)` }}
                      aria-label={`Dirección del viento: ${reading!.windDirDeg}°`}
                    />
                  )}
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
