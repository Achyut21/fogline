"use client";

import { RadioGroup } from "radix-ui";
import type { ReactNode } from "react";

type Choice<T extends string> = { value: T; label: ReactNode; detail?: ReactNode };

// A vertical radiogroup of tappable rows: arrow keys move the choice, the chosen row gets an
// accent ring. `value` "" selects nothing.
export function ChoiceList<T extends string>({
  label,
  choices,
  value,
  onValueChange,
}: {
  label: string;
  choices: readonly Choice<T>[];
  value: T | "";
  onValueChange: (value: T) => void;
}) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        const choice = choices.find((c) => c.value === next);
        if (choice) onValueChange(choice.value);
      }}
      className="flex flex-col gap-2"
    >
      {choices.map((choice) => (
        <RadioGroup.Item
          key={choice.value}
          value={choice.value}
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md bg-surface px-4 py-2 text-left text-base font-bold text-ink shadow-sm data-[state=checked]:bg-accent-soft data-[state=checked]:ring-2 data-[state=checked]:ring-accent data-[state=checked]:ring-inset"
        >
          <span className="flex flex-wrap items-center gap-2">{choice.label}</span>
          {choice.detail}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
