import { alongLine, cumulativeMeters } from "@/lib/geo/along";
import type { ShapeLine } from "@/lib/gtfs/types";

// A recorded trip (F3.5) is one vehicle_positions row a minute, so a train moves several stops
// between rows. Every station along the shape between two rows counts as passed, timed by how far
// along the line it sits between them (PROGRESS, open question on "passed").

export type Sample = { ts: Date; lat: number; lon: number };

export type StationTime = { station: string; at: Date };

export type RideStop = StationTime & { event: "board" | "pass" | "alight" };

// A train sits within this many meters of a station's mark on the shape while at its platform.
const platformM = 150;

/**
 * The shape of a route and direction through `from` that holds the most of the stations a trip
 * was seen at, which tells the Red Line's Ashmont and Braintree branches apart.
 */
export function shapeFor(
  shapes: readonly ShapeLine[],
  route: string,
  direction: 0 | 1,
  from: string,
  seen: readonly string[],
): ShapeLine | undefined {
  let best: { line: ShapeLine; score: number } | undefined;
  for (const line of shapes) {
    if (line.route !== route || line.direction !== direction) continue;
    const on = new Set(line.stops.map((s) => s.station));
    if (!on.has(from)) continue;
    const score = seen.filter((station) => on.has(station)).length;
    if (!best || score > best.score) best = { line, score };
  }
  return best?.line;
}

/**
 * When the train reached each station the samples cover, in order. A station's time comes from the
 * two samples on either side of it; the first station is timed when the train leaves it.
 */
export function stationTimes(samples: readonly Sample[], shape: ShapeLine): StationTime[] {
  if (samples.length < 2) return [];
  const sorted = [...samples].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const cumulative = cumulativeMeters(shape.points);
  let segment = 0;
  let furthest = 0;
  const track = sorted.map((s) => {
    const found = alongLine(shape.points, cumulative, s, segment);
    segment = found.segment;
    furthest = Math.max(furthest, found.meters);
    return { t: s.ts.getTime(), meters: furthest };
  });
  const start = track[0].meters;
  const end = track[track.length - 1].meters;
  const times: StationTime[] = [];
  for (const stop of shape.stops) {
    if (stop.meters < start - platformM || stop.meters > end + platformM) continue;
    if (times.length === 0) {
      const leaving = track.filter((p) => p.meters <= stop.meters + platformM).at(-1) ?? track[0];
      times.push({ station: stop.station, at: new Date(leaving.t) });
      continue;
    }
    const after = track.findIndex((p) => p.meters >= stop.meters - platformM);
    if (after === -1) continue;
    const a = track[Math.max(after - 1, 0)];
    const b = track[after];
    const span = b.meters - a.meters;
    const share = span <= 0 ? 1 : Math.min(1, Math.max(0, (stop.meters - a.meters) / span));
    const at = Math.max(a.t + share * (b.t - a.t), times[times.length - 1].at.getTime());
    times.push({ station: stop.station, at: new Date(at) });
  }
  return times;
}

/** Board at `from`, pass what lies between, alight at `to` or the last station recorded. */
export function rideStops(times: readonly StationTime[], from: string, to?: string): RideStop[] {
  const start = times.findIndex((t) => t.station === from);
  if (start === -1) return [];
  const stop = to ? times.findIndex((t, i) => i > start && t.station === to) : times.length - 1;
  if (stop <= start) return [];
  return times.slice(start, stop + 1).map((t, i, ride) => ({
    ...t,
    event: i === 0 ? "board" : i === ride.length - 1 ? "alight" : "pass",
  }));
}
