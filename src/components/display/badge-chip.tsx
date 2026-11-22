import { Award, Lock } from "lucide-react";
import { display } from "@/copy";
import { cn } from "@/lib/utils";

// Locked badges get a lock glyph, a dashed border and ", locked" for screen readers, so color is
// never the only cue.
export function BadgeChip({
  name,
  earned,
  className,
}: {
  name: string;
  earned: boolean;
  className?: string;
}) {
  const Glyph = earned ? Award : Lock;
  return (
    <span
      data-earned={earned}
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-full border border-rule px-3 text-xs font-semibold",
        earned ? "text-ink" : "border-dashed text-ink-muted",
        className,
      )}
    >
      <Glyph aria-hidden="true" className={cn("size-4 shrink-0", earned && "text-accent")} />
      {earned ? (
        name
      ) : (
        <>
          <span aria-hidden="true">{name}</span>
          <span className="sr-only">{display.badgeLocked(name)}</span>
        </>
      )}
    </span>
  );
}
