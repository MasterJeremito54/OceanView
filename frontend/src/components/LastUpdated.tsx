"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";

export type Freshness = "live" | "aging" | "stale" | "never";

// Umbrales pensados para un ciclo de ingesta de 15 min: "en vivo" cubre
// ~1 ciclo perdido de margen, "envejeciendo" cubre ~4 ciclos antes de
// considerar la boya realmente caída (coincide con INACTIVE_AFTER_FAILURES
// del backend, que marca active:false a los 3 fallos consecutivos).
const LIVE_THRESHOLD_MIN = 20;
const AGING_THRESHOLD_MIN = 60;

export function getFreshness(
  lastSeenAt: string | null,
  active: boolean
): Freshness {
  if (!lastSeenAt) return "never";

  const minutesAgo = (Date.now() - new Date(lastSeenAt).getTime()) / 60000;

  if (!active) return "stale";
  if (minutesAgo <= LIVE_THRESHOLD_MIN) return "live";
  if (minutesAgo <= AGING_THRESHOLD_MIN) return "aging";
  return "stale";
}

const LABELS: Record<Freshness, string> = {
  live: "En vivo",
  aging: "Actualizando",
  stale: "Sin respuesta",
  never: "Sin datos aún",
};

// Fuente única de verdad para el color de cada estado — BuoyCard (barra de
// acento) y BuoyMap (marcadores) importan esto en vez de duplicar hexadecimales.
export const STATUS_COLOR: Record<Freshness, string> = {
  live: "#4F9B8C",
  aging: "#E8A33D",
  stale: "#E85C4A",
  never: "#6E8FA3",
};

const DOT_CLASSES: Record<Freshness, string> = {
  live: "bg-signal-live animate-pulse-slow shadow-[0_0_6px_2px_rgba(79,155,140,0.5)]",
  aging: "bg-signal-amber",
  stale: "bg-signal-alert",
  never: "bg-ink-muted",
};

interface LastUpdatedProps {
  lastSeenAt: string | null;
  active: boolean;
  className?: string;
}

export function LastUpdated({ lastSeenAt, active, className }: LastUpdatedProps) {
  const freshness = getFreshness(lastSeenAt, active);

  return (
    <div className={`flex items-center gap-1.5 text-xs text-ink-muted ${className ?? ""}`}>
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[freshness]}`}
        aria-hidden
      />
      <span>
        {LABELS[freshness]}
        {lastSeenAt && (
          <>
            {" "}
            · hace{" "}
            {formatDistanceToNowStrict(new Date(lastSeenAt), { locale: es })}
          </>
        )}
      </span>
    </div>
  );
}
