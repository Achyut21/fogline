import type { ShapeLine } from "@/lib/gtfs/types";

const metersPerMile = 1609.344;

/**
 * Miles ridden on a route between two stations, along the route's shape, to 0.1 mi (F3.4,
 * DATA 3.4). Null when no canonical pattern of the route passes both stations in that order.
 */
export function rideMiles(
  shapes: ShapeLine[],
  route: string,
  from: string,
  to: string,
): number | null {
  for (const line of shapes) {
    if (line.route !== route) continue;
    const board = line.stops.findIndex((s) => s.station === from);
    const alight = line.stops.findIndex((s) => s.station === to);
    if (board === -1 || alight <= board) continue;
    const meters = line.stops[alight].meters - line.stops[board].meters;
    return Math.round((meters / metersPerMile) * 10) / 10;
  }
  return null;
}
