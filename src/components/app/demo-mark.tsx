"use client";

import { useSyncExternalStore } from "react";
import { DemoChip } from "@/components/system/demo-chip";

// The Demo chip on every screen while a demo profile is signed in (F16.3). The cookie can change
// on any navigation, so it is read again whenever the tab regains focus or the route changes.
const subscribe = (onChange: () => void) => {
  window.addEventListener("focus", onChange);
  window.addEventListener("popstate", onChange);
  const id = setInterval(onChange, 2_000);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("popstate", onChange);
    clearInterval(id);
  };
};
const isDemo = () => document.cookie.split("; ").includes("fogline_demo=1");

export const useDemo = () => useSyncExternalStore(subscribe, isDemo, () => false);

// Rendered in space each screen already reserves (the tab bar, PageHeader, the ride header), so
// it never covers content.
export function DemoMark({ className }: { className?: string }) {
  return useDemo() ? <DemoChip className={className} /> : null;
}
