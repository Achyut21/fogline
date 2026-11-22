import { cellsToMultiPolygon } from "h3-js";
import type { CellState } from "@/lib/geo/cells";
import { fogExtent } from "@/three/fog-field";

type Ring = number[][];

function inside([x, y]: number[], ring: Ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function area(ring: Ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(sum / 2);
}

// The 2D fog on the map (F2.6). One polygon covers the fog extent with a hole for every uncovered
// area. Every pocket of fog enclosed by uncovered cells is a polygon of its own, holding the
// uncovered areas nested in it. Seen cells get a second, thinner layer.
export function fillFog(states: ReadonlyMap<string, CellState>) {
  const { west, south, east, north } = fogExtent;
  const world = [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
    [west, north],
  ];
  const uncovered = cellsToMultiPolygon([...states.keys()], true);
  const pockets = uncovered
    .flatMap((polygon) => polygon.slice(1))
    .sort((a, b) => area(a) - area(b));
  const fog: Ring[][] = [[world], ...pockets.map((ring) => [ring])];
  for (const [outer] of uncovered) {
    fog[pockets.findIndex((ring) => inside(outer[0], ring)) + 1].push(outer);
  }
  const seen = [...states].filter(([, s]) => s === "seen").map(([cell]) => cell);
  return {
    fog: {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "MultiPolygon" as const, coordinates: fog },
    },
    seen: {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "MultiPolygon" as const, coordinates: cellsToMultiPolygon(seen, true) },
    },
  };
}
