"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Thermometer,
  Waves,
  Wind,
  Gauge,
  Droplets,
  Compass as CompassIcon,
} from "lucide-react";
import { useStationDetail } from "@/hooks/useStationDetail";
import { useStationReadings } from "@/hooks/useStationReadings";
import { LastUpdated } from "@/components/LastUpdated";
import { WindCompass } from "@/components/WindCompass";
import { ReadingChart } from "@/components/ReadingChart";

const RANGE_OPTIONS = [
  { label: "24h", value: "24h" },
  { label: "48h", value: "48h" },
  { label: "72h", value: "72h" },
];

function formatValue(
  value: number | null | undefined,
  unit: string,
  digits = 1
): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(digits)}${unit}`;
}

function msToKmh(ms: number | null | undefined): number | null {
  return ms === null || ms === undefined ? null : Math.round(ms * 3.6);
}

export default function StationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [range, setRange] = useState("24h");

  const { data: station, isLoading, isError, error } = useStationDetail(id);
  const { data: readingsData } = useStationReadings(id, range);

  const reading = station?.latestReading;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} aria-hidden />
        Todas las boyas
      </Link>

      {isLoading && (
        <p className="text-sm text-ink-muted">Cargando datos de la boya…</p>
      )}

      {isError && (
        <div className="rounded-lg border border-signal-alert/40 bg-signal-alert/10 p-4 text-sm text-signal-alert">
          No se pudo cargar la boya {id}.{" "}
          {error instanceof Error ? error.message : "Intenta de nuevo en unos minutos."}
        </div>
      )}

      {station && (
        <>
          <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
                {station.name}
              </h1>
              <p className="font-mono text-xs text-ink-muted">
                {station.latitude.toFixed(3)}°, {station.longitude.toFixed(3)}° · ID{" "}
                {station.id}
              </p>
            </div>
            <LastUpdated lastSeenAt={station.lastSeenAt} active={station.active} />
          </header>

          {/* Panel de instrumentos: todos los datos actuales de la boya */}
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat
              icon={<Thermometer size={14} aria-hidden />}
              label="Temp. agua"
              value={formatValue(reading?.waterTempC, "°C")}
            />
            <Stat
              icon={<Thermometer size={14} aria-hidden />}
              label="Temp. aire"
              value={formatValue(reading?.airTempC, "°C")}
            />
            <Stat
              icon={<Droplets size={14} aria-hidden />}
              label="Punto de rocío"
              value={formatValue(reading?.dewPointC, "°C")}
            />
            <Stat
              icon={<Gauge size={14} aria-hidden />}
              label="Presión"
              value={formatValue(reading?.pressureHpa, " hPa", 1)}
            />
            <Stat
              icon={<Waves size={14} aria-hidden />}
              label="Oleaje"
              value={formatValue(reading?.waveHeightM, "m")}
            />
            <Stat
              icon={<Waves size={14} aria-hidden />}
              label="Periodo dominante"
              value={formatValue(reading?.dominantWavePeriodS, "s", 0)}
            />
            <Stat
              icon={<Waves size={14} aria-hidden />}
              label="Periodo promedio"
              value={formatValue(reading?.avgWavePeriodS, "s")}
            />
            <Stat
              icon={<CompassIcon size={14} aria-hidden />}
              label="Dirección de ola"
              value={formatValue(reading?.waveDirDeg, "°", 0)}
            />
          </section>

          {/* Viento: compás visual + valores */}
          <section className="mb-8 grid grid-cols-1 items-center gap-4 rounded-lg border border-panel-border bg-panel p-4 sm:grid-cols-[auto_1fr]">
            <WindCompass
              directionDeg={reading?.windDirDeg ?? null}
              speedKmh={msToKmh(reading?.windSpeedMs)}
            />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Stat
                icon={<Wind size={14} aria-hidden />}
                label="Velocidad"
                value={formatValue(msToKmh(reading?.windSpeedMs), " km/h", 0)}
              />
              <Stat
                icon={<Wind size={14} aria-hidden />}
                label="Ráfaga"
                value={formatValue(msToKmh(reading?.gustMs), " km/h", 0)}
              />
              <Stat
                icon={<CompassIcon size={14} aria-hidden />}
                label="Dirección"
                value={formatValue(reading?.windDirDeg, "°", 0)}
              />
            </div>
          </section>

          {/* Selector de rango para el histórico */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
              Histórico
            </p>
            <div className="ml-auto flex gap-1.5">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRange(opt.value)}
                  className={`min-h-[32px] rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    range === opt.value
                      ? "bg-signal-amber text-abyss"
                      : "border border-panel-border text-ink-muted hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ReadingChart
              data={readingsData?.readings ?? []}
              dataKey="waveHeightM"
              label="Altura de ola"
              unit="m"
              color="#4F9B8C"
            />
            <ReadingChart
              data={readingsData?.readings ?? []}
              dataKey="waterTempC"
              label="Temperatura del agua"
              unit="°C"
              color="#E8A33D"
            />
          </section>
        </>
      )}
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-panel-border bg-panel p-3">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-mono text-lg tabular-nums text-ink">{value}</dd>
    </div>
  );
}
