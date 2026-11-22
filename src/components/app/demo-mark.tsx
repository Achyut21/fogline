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

export function DemoMark() {
  const demo = useSyncExternalStore(subscribe, isDemo, () => false);
  if (!demo) return null;
  return (
    // Bottom left, above the tab bar: clear of every header's buttons.
    <div className="pointer-events-none fixed bottom-0 left-0 z-(--layer-chips) pb-safe pl-4">
      <div className="mb-18">
        <DemoChip />
      </div>
    </div>
  );
}
