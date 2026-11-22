"use client";

import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

// A radiogroup (D-054): arrow keys move the choice, the selected label is bold on a raised thumb.
// `value` "" selects nothing, for a choice the server can't know before hydration.
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T | "";
  onValueChange: (value: T) => void;
  className?: string;
}) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        const option = options.find((o) => o.value === next);
        if (option) onValueChange(option.value);
      }}
      orientation="horizontal"
      loop
      className={cn(
        "grid auto-cols-fr grid-flow-col gap-1 rounded-md bg-surface-sunken p-1",
        className,
      )}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className="h-11 rounded-sm px-3 text-base font-semibold text-ink-muted data-[state=checked]:bg-surface data-[state=checked]:font-bold data-[state=checked]:text-ink data-[state=checked]:shadow-sm"
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
