import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

export function ParticipantChip({
  name,
  status,
  className,
}: {
  name: string;
  status?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-full bg-surface-sunken py-1 pr-3 pl-1 text-sm",
        className,
      )}
    >
      <Avatar name={name} className="size-6 bg-surface text-xs" />
      <span className="font-semibold text-ink">{name}</span>
      {status && <span className="text-ink-muted">{status}</span>}
    </span>
  );
}
