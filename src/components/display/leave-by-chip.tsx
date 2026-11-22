import { display } from "@/copy";
import { zone } from "@/lib/time";
import { cn } from "@/lib/utils";

const clock = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: zone,
});

// COPY.md joins a time and its AM or PM with a no-break space. Intl puts a narrow one there.
function clockTime(at: Date) {
  return clock.format(at).replace(/\s/u, " ");
}

export function LeaveByChip({ at, className }: { at: Date; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1 rounded-full bg-surface-sunken px-3 text-sm font-semibold",
        className,
      )}
    >
      {display.leaveBy} <span className="font-extrabold tabular-nums">{clockTime(at)}</span>
    </span>
  );
}
