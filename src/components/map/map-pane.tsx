"use client";

import type { CellState } from "@/lib/geo/cells";
import { FogFallback } from "./fog-fallback";
import { FogMap, type MapLine, type MapStation } from "./fog-map";
import { useFogRenderer } from "./use-fog-renderer";

// The live map: the shader or 2D fill on MapLibre, or the SVG map without WebGL (F2.6).
export function MapPane({
  states,
  lines,
  stations,
  center,
  label,
  onStation,
}: {
  states: ReadonlyMap<string, CellState>;
  lines: readonly MapLine[];
  stations: readonly MapStation[];
  center: { lat: number; lon: number };
  label: string;
  onStation?: (id: string) => void;
}) {
  const { renderer } = useFogRenderer();
  if (renderer === "svg") return <FogFallback states={states} lines={lines} stations={stations} />;
  if (!renderer) return null;
  return (
    <FogMap
      renderer={renderer}
      states={states}
      revealAt={null}
      lines={lines}
      stations={stations}
      center={center}
      zoom={13.4}
      label={label}
      onStation={onStation}
    />
  );
}
