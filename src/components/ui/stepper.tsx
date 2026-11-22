"use client";

import { Minus, Plus } from "lucide-react";
import { system } from "@/copy";
import { IconButton } from "./icon-button";

// A whole number between min and max. The value is announced politely when it changes. At a
// limit the button stays focusable (aria-disabled), so keyboard focus doesn't drop to the page.
export function Stepper({
  label,
  value,
  min,
  max,
  onValueChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-3">
      <IconButton
        label={system.stepper.decrease(label)}
        icon={Minus}
        aria-disabled={value <= min}
        onClick={() => value > min && onValueChange(value - 1)}
      />
      <output
        aria-live="polite"
        className="min-w-8 text-center text-xl font-extrabold tabular-nums"
      >
        {value}
      </output>
      <IconButton
        label={system.stepper.increase(label)}
        icon={Plus}
        aria-disabled={value >= max}
        onClick={() => value < max && onValueChange(value + 1)}
      />
    </div>
  );
}
