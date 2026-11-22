import { system } from "@/copy";

// Marks demo data (F16). Anything shown in demo mode carries it.
export function DemoChip() {
  return (
    <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-ink">
      {system.demo}
    </span>
  );
}
