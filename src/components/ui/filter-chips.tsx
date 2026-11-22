"use client";

import { cn } from "@/lib/utils";

type Chip<T extends string> = { value: T; label: string };

// Toggle chips in a row that scrolls sideways. Each chip is a toggle button (aria-pressed).
export function FilterChips<T extends string>({
  label,
  chips,
  selected,
  onToggle,
  className,
}: {
  label: string;
  chips: readonly Chip<T>[];
  selected: ReadonlySet<T>;
  onToggle: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex [scrollbar-width:none] gap-2 overflow-x-auto", className)}
    >
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          aria-pressed={selected.has(chip.value)}
          onClick={() => onToggle(chip.value)}
          className="h-11 shrink-0 rounded-full bg-surface-sunken px-4 text-sm font-semibold text-ink aria-pressed:bg-accent-soft aria-pressed:font-bold"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
