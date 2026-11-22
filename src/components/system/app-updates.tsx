"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { system } from "@/copy";

/**
 * "Update ready" when a new version is waiting (PWA.md): Refresh hands control to it and reloads.
 * The page never reloads on its own. Also asks the browser to keep this site's storage, so Safari
 * doesn't clear it for an app used now and then.
 */
export function AppUpdates() {
  const { serwist } = useSerwist();

  useEffect(() => {
    void navigator.storage?.persist?.();
  }, []);

  useEffect(() => {
    if (!serwist) return;
    const waiting = () => {
      toast(system.update.title, {
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: system.update.refresh,
          onClick: () => {
            serwist.addEventListener("controlling", () => window.location.reload());
            serwist.messageSkipWaiting();
          },
        },
      });
    };
    serwist.addEventListener("waiting", waiting);
    return () => serwist.removeEventListener("waiting", waiting);
  }, [serwist]);

  return null;
}
