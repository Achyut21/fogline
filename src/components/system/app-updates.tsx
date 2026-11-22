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
      // One toast however many versions wait. Another tab may already have switched to the new
      // version, and then nothing is waiting here: Refresh just reloads.
      toast(system.update.title, {
        id: "update-ready",
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: system.update.refresh,
          onClick: async () => {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration?.waiting) {
              window.location.reload();
              return;
            }
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
