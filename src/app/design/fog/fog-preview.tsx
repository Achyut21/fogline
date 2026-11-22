"use client";

import dynamic from "next/dynamic";

// MapLibre and three.js load after first paint and never on the server (DESIGN section 9).
const FogSpike = dynamic(() => import("./fog-spike").then((m) => m.FogSpike), {
  ssr: false,
  loading: () => <div className="h-dvh animate-pulse bg-surface-sunken" />,
});

export function FogPreview(props: { tierOverride: number | null }) {
  return <FogSpike {...props} />;
}
