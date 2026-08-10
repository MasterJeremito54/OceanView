import type { Station } from "@/types/station";
import { getFreshness } from "./LastUpdated";

export function FleetStatus({ stations }: { stations: Station[] }) {
  const total = stations.length;
  const live = stations.filter(
    (s) => getFreshness(s.lastSeenAt, s.active) === "live"
  ).length;

  return (
    <div className="flex items-center gap-2 rounded-full border border-panel-border bg-panel px-3 py-1.5 text-xs text-ink-muted">
      <span
        className="h-1.5 w-1.5 rounded-full bg-signal-live animate-pulse-slow"
        aria-hidden
      />
      <span className="font-mono tabular-nums text-ink">
        {live}/{total}
      </span>
      <span>boyas en vivo</span>
    </div>
  );
}
