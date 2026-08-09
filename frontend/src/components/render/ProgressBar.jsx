export function ProgressBar({ samples, maxSamples }) {
  const pct = maxSamples > 0 ? Math.min(100, (samples / maxSamples) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={samples}
      aria-valuemin={0}
      aria-valuemax={maxSamples}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-raised"
    >
      <div className="h-full bg-ember transition-[width] duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}
