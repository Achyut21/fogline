"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { design } from "@/copy";

const options = [
  { value: "system", label: design.theme.system },
  { value: "light", label: design.theme.day },
  { value: "dark", label: design.theme.night },
] as const;

type Theme = (typeof options)[number]["value"];

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The server can't know the stored theme, so nothing shows as selected until hydration ends.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const current = options.find((o) => o.value === theme)?.value;
  return (
    <SegmentedControl<Theme>
      label={design.theme.label}
      options={options}
      value={hydrated && current ? current : ""}
      onValueChange={setTheme}
    />
  );
}
