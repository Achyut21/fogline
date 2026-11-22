"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { design } from "@/copy";

const options = [
  { value: "system", label: design.theme.system },
  { value: "light", label: design.theme.day },
  { value: "dark", label: design.theme.night },
] as const;

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The server can't know the stored theme, so nothing shows as pressed until hydration ends.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
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
          aria-pressed={hydrated && theme === option.value}
          onClick={() => setTheme(option.value)}
          className="min-h-11 rounded-sm px-3 text-base font-semibold text-ink-muted aria-pressed:bg-surface aria-pressed:font-bold aria-pressed:text-ink aria-pressed:shadow-sm"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
