import { system } from "@/copy";
import { cn } from "@/lib/utils";

// Marks demo data (F16). Anything shown in demo mode carries it.
export function DemoChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-ink",
        className,
      )}
    >
      {system.demo}
    </span>
  );
}
