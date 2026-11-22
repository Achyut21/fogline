"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { readForce2d, subscribeForce2d } from "./map-preference";
import { fogRenderer, type FogRenderer } from "@/three/tier";

// Picks the fog renderer (D-058): no WebGL gives the SVG map, otherwise detect-gpu's tier
// decides, from benchmarks served by this app. A failed detection falls back to the 2D fill, and
// "Always 2D" in Settings asks for it.
// Client-only: callers load it with ssr: false.
export function useFogRenderer(tierOverride: number | null = null) {
  const [webgl] = useState(() => Boolean(document.createElement("canvas").getContext("webgl2")));
  const [tier, setTier] = useState<number | null>(tierOverride);
  const [failed, setFailed] = useState(false);
  const force2d = useSyncExternalStore(subscribeForce2d, readForce2d, () => false);

  useEffect(() => {
    if (tierOverride !== null) return;
    void import("@pmndrs/detect-gpu")
      .then(({ getGPUTier }) => getGPUTier({ benchmarksURL: "/detect-gpu" }))
      .then((result) => setTier(result.tier))
      .catch(() => {
        setFailed(true);
        setTier(1);
      });
  }, [tierOverride]);

  const renderer: FogRenderer | null = tier === null ? null : fogRenderer({ webgl, tier, force2d });
  return { renderer, tier, failed };
}
