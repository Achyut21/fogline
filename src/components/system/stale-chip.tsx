import { Clock } from "lucide-react";
import { system } from "@/copy";
import { cn } from "@/lib/utils";

// How old live data is (F2.5: stale data shows its age). The caller decides when it is stale, since
// each feed has its own update rate; then the chip turns warning.
export function StaleChip({ minutes, stale }: { minutes: number; stale: boolean }) {
  return (
    <span
      data-stale={stale}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-surface-sunken px-3 py-1 text-xs font-bold tabular-nums",
        stale ? "text-warning" : "text-ink-muted",
      )}
    >
      <Clock aria-hidden="true" className="size-3" />
      {system.stale(minutes)}
    </span>
  );
}
