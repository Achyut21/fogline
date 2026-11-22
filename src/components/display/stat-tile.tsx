import { cn } from "@/lib/utils";
import { StatCounter } from "./stat-counter";

// One label and number pair. It renders <dt> and <dd>, so tiles go inside a <dl>.
export function StatTile({
  label,
  value,
  decimals,
  suffix,
  outlined = false,
  accent = false,
  className,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  outlined?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse rounded-md p-2",
        outlined ? "border border-rule" : "bg-surface-sunken",
        className,
      )}
    >
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={cn("text-xl font-extrabold", accent && "text-accent")}>
        <StatCounter value={value} decimals={decimals} suffix={suffix} />
      </dd>
    </div>
  );
}
