interface WindCompassProps {
  directionDeg: number | null;
  speedKmh: number | null;
}

export function WindCompass({ directionDeg, speedKmh }: WindCompassProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-panel-border">
        <span className="absolute top-1.5 text-[10px] text-ink-muted">N</span>
        <span className="absolute bottom-1.5 text-[10px] text-ink-muted">S</span>
        <span className="absolute left-2 text-[10px] text-ink-muted">O</span>
        <span className="absolute right-2 text-[10px] text-ink-muted">E</span>

        {directionDeg !== null ? (
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10 text-signal-amber"
            style={{ transform: `rotate(${directionDeg}deg)` }}
            aria-label={`Dirección del viento: ${directionDeg}°`}
          >
            <path d="M12 2 L16 14 L12 11 L8 14 Z" fill="currentColor" />
          </svg>
        ) : (
          <span className="text-[10px] text-ink-muted">sin dato</span>
        )}
      </div>
      <p className="font-mono text-sm tabular-nums text-ink">
        {speedKmh === null ? "—" : `${speedKmh} km/h`}
      </p>
    </div>
  );
}
