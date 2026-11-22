"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";
import { system } from "@/copy";

function subscribe(change: () => void) {
  window.addEventListener("online", change);
  window.addEventListener("offline", change);
  return () => {
    window.removeEventListener("online", change);
    window.removeEventListener("offline", change);
  };
}

// Shows while the browser is offline. `offline` forces it on or off, for /design.
export function OfflineBanner({ offline }: { offline?: boolean }) {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (!(offline ?? !online)) return null;
  return (
    <div role="status" className="bg-ink pt-safe text-bg">
      <p className="flex items-center gap-2 px-4 py-2 text-sm font-bold">
        <WifiOff aria-hidden="true" className="size-4 shrink-0" />
        {system.offlineBanner}
      </p>
    </div>
  );
}
