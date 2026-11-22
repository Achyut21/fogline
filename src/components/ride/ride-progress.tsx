import { type Line, lineFill } from "@/components/display/line-badge";
import { ride } from "@/copy";
import { cn } from "@/lib/utils";

/**
 * The 2D ride (DESIGN section 9, RideProgress): the line from the first stop to the last with a
 * dot where the train is now, the stop it's at and the next one, and the ride's running numbers.
 * The dot moves with transform only, inside a box that clips the moved layer so the screen never
 * scrolls sideways; the box's padding is the dot's radius, so the dot shows whole at both ends.
 */
export function RideProgress({
  line,
  progress,
  here,
  upcoming,
  stops,
  miles,
  cells,
}: {
  line: Line | null;
  /** 0 at the first stop, 1 at the last. */
  progress: number;
  here: string;
  upcoming: string | null;
  stops: number;
  miles: number | null;
  cells: number;
}) {
  const share = Math.min(1, Math.max(0, progress));
  const fill = line ? lineFill[line] : "bg-ink-muted";
  return (
    <section aria-label={ride.progress.label} className="flex flex-col gap-3">
      <div className="overflow-x-clip px-2">
        <div className="relative h-4">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-rule" />
          <div
            className={cn(
              "absolute inset-x-0 top-1/2 h-1 origin-left -translate-y-1/2 rounded-full transition-transform duration-(--duration-base) motion-reduce:transition-none",
              fill,
            )}
            style={{ transform: `scaleX(${share})` }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 transition-transform duration-(--duration-base) motion-reduce:transition-none"
            style={{ transform: `translateX(${share * 100}%)` }}
          >
            <span className="block size-4 -translate-x-1/2 rounded-full border-2 border-surface bg-ink shadow-sm" />
          </div>
        </div>
      </div>
      <div className="flex justify-between gap-3 text-xs text-ink-muted">
        <span>{here}</span>
        {upcoming && <span className="text-right">{upcoming}</span>}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col-reverse rounded-md bg-surface-sunken p-2">
          <dt className="text-xs text-ink-muted">{ride.summary.stops}</dt>
          <dd className="text-xl font-extrabold tabular-nums">{stops}</dd>
        </div>
        <div className="flex flex-col-reverse rounded-md bg-surface-sunken p-2">
          <dt className="text-xs text-ink-muted">{ride.summary.miles}</dt>
          <dd className="text-xl font-extrabold tabular-nums">
            {(miles ?? 0).toFixed(1)}
            {ride.summary.milesSuffix}
          </dd>
        </div>
        <div className="flex flex-col-reverse rounded-md bg-surface-sunken p-2">
          <dt className="text-xs text-ink-muted">{ride.summary.cells}</dt>
          <dd className="text-xl font-extrabold text-accent tabular-nums">{cells}</dd>
        </div>
      </dl>
    </section>
  );
}
