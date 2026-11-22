"use client";

import { useTheme } from "next-themes";
import { design } from "@/copy";

const options = [
  { value: "system", label: design.theme.system },
  { value: "light", label: design.theme.day },
  { value: "dark", label: design.theme.night },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label={design.theme.label}
      className="grid grid-cols-3 gap-1 rounded-md bg-surface-sunken p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
          className="min-h-11 rounded-sm px-3 text-sm font-semibold text-ink-muted aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
