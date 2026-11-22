"use client";

import { ride } from "@/copy";

/** The T line's own color for a route (DESIGN section 3): branches share their line's color. */
function lineColor(route: string) {
  if (route.startsWith("Green")) return "bg-(--line-green)";
  if (route === "Orange") return "bg-(--line-orange)";
  if (route === "Blue") return "bg-(--line-blue)";
  return "bg-(--line-red)";
}

/**
 * The 2D ride (DESIGN section 9, RideProgress): the line from the first stop to the last with a
 * dot where the train is now, the stops just behind and ahead, and the ride's running numbers.
 * The dot moves with transform only, and steps without easing under reduced motion.
 */
export function RideProgress({
  route,
  progress,
  previous,
  upcoming,
  stops,
  miles,
  cells,
}: {
  route: string;
  /** 0 at the first stop, 1 at the last. */
  progress: number;
  previous: string;
  upcoming: string | null;
  stops: number;
  miles: number | null;
  cells: number;
}) {
  const share = Math.min(1, Math.max(0, progress));
  return (
    <section aria-label={ride.progress.label} className="flex flex-col gap-3">
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-rule" />
        <div
          className={`absolute inset-x-0 top-1/2 h-1 origin-left -translate-y-1/2 rounded-full ${lineColor(route)} transition-transform duration-(--duration-base) motion-reduce:transition-none`}
          style={{ transform: `translateY(-50%) scaleX(${share})` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 transition-transform duration-(--duration-base) motion-reduce:transition-none"
          style={{ transform: `translateX(${share * 100}%)` }}
        >
          <span className="block size-3 -translate-x-1/2 rounded-full border-2 border-surface bg-ink shadow-sm" />
        </div>
      </div>
      <div className="flex justify-between gap-3 text-xs text-ink-muted">
        <span>{previous}</span>
        {upcoming && <span className="text-right">{upcoming}</span>}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col-reverse rounded-md bg-surface-sunken p-2">
          <dt className="text-xs text-ink-muted">{ride.summary.stops}</dt>
          <dd className="text-lg font-extrabold tabular-nums">{stops}</dd>
        </div>
        <div className="flex flex-col-reverse rounded-md bg-surface-sunken p-2">
          <dt className="text-xs text-ink-muted">{ride.summary.miles}</dt>
          <dd className="text-lg font-extrabold tabular-nums">
            {(miles ?? 0).toFixed(1)}
            {ride.summary.milesSuffix}
          </dd>
        </div>
        <div className="flex flex-col-reverse rounded-md bg-surface-sunken p-2">
          <dt className="text-xs text-ink-muted">{ride.summary.cells}</dt>
          <dd className="text-lg font-extrabold text-accent tabular-nums">{cells}</dd>
        </div>
      </dl>
    </section>
  );
}
