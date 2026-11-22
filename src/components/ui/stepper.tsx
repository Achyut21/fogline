"use client";

import { Minus, Plus } from "lucide-react";
import { system } from "@/copy";
import { IconButton } from "./icon-button";

// A whole number between min and max. The value is announced politely when it changes.
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
        disabled={value <= min}
        onClick={() => onValueChange(Math.max(min, value - 1))}
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
        disabled={value >= max}
        onClick={() => onValueChange(Math.min(max, value + 1))}
      />
    </div>
  );
}
