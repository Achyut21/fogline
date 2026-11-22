import { display } from "@/copy";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

export function AvatarStack({
  names,
  max = 3,
  className,
}: {
  names: readonly string[];
  max?: number;
  className?: string;
}) {
  const shown = names.slice(0, max);
  const hidden = names.length - shown.length;
  return (
    <span
      role="img"
      aria-label={display.people(names)}
      className={cn("inline-flex items-center -space-x-2", className)}
    >
      {shown.map((name, i) => (
        <Avatar key={i} name={name} className="ring-2 ring-surface" />
      ))}
      {hidden > 0 && (
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface-sunken text-xs font-extrabold text-ink tabular-nums ring-2 ring-surface">
          {display.more(hidden)}
        </span>
      )}
    </span>
  );
}
