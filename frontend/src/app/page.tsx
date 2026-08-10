"use client";

import dynamic from "next/dynamic";
import { useStations } from "@/hooks/useStations";
import { BuoyCard } from "@/components/BuoyCard";
import { FleetStatus } from "@/components/FleetStatus";

// Leaflet toca `window` directamente — no puede renderizar en el servidor.
// dynamic(..., { ssr: false }) es la forma correcta de excluirlo del SSR
// en el App Router sin mover toda la página a un componente cliente aparte.
const BuoyMap = dynamic(
  () => import("@/components/BuoyMap").then((mod) => mod.BuoyMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-ink-muted">
        Cargando mapa…
      </div>
    ),
  }
);

export default function HomePage() {
  const { data: stations, isLoading, isError, error } = useStations();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
            OceanView
          </h1>
          <p className="text-sm text-ink-muted">
            Monitoreo oceanográfico en tiempo real · datos de NOAA NDBC
          </p>
        </div>
        {stations && stations.length > 0 && <FleetStatus stations={stations} />}
      </header>

      <section className="mb-8 h-[320px] overflow-hidden rounded-lg border border-panel-border sm:h-[400px]">
        {stations && stations.length > 0 ? (
          <BuoyMap stations={stations} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            {isLoading ? "Cargando boyas…" : "Sin boyas para mostrar"}
          </div>
        )}
      </section>

      {isLoading && (
        <p className="text-sm text-ink-muted">Cargando datos de las boyas…</p>
      )}

      {isError && (
        <div className="rounded-lg border border-signal-alert/40 bg-signal-alert/10 p-4 text-sm text-signal-alert">
          No se pudo cargar la lista de boyas.{" "}
          {error instanceof Error ? error.message : "Intenta de nuevo en unos minutos."}
        </div>
      )}

      {stations && stations.length > 0 && (
        <>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
            Boyas monitoreadas
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:[&>*:nth-child(odd):last-child]:col-span-2 lg:grid-cols-3 lg:[&>*:nth-child(odd):last-child]:col-span-1">
            {stations.map((station) => (
              <BuoyCard key={station.id} station={station} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
