import { haversineM, type LatLon } from "@/lib/geo/distance";
import type { Station } from "@/lib/gtfs/types";

/**
 * A `ride_events` row as the rules read it. A ride's own summary counts its events, replay or not
 * (F3.5); night and lifetime totals and badges count only `live` events (D-059).
 */
export type RideEvent = {
  ts: Date;
  routeId: string;
  tripId: string | null;
  stopId: string | null;
  event: "board" | "pass" | "alight" | "on_train";
  isReplay: boolean;
};

export const lines = ["Red", "Orange", "Blue", "Green", "Mattapan"] as const;
export type Line = (typeof lines)[number];

export const greenBranches = ["Green-B", "Green-C", "Green-D", "Green-E"] as const;

export function lineOf(routeId: string): Line | null {
  if (routeId.startsWith("Green-")) return "Green";
  return lines.find((line) => line === routeId) ?? null;
}

/** Events from rides the person took, not replays. */
export function live(events: readonly RideEvent[]): RideEvent[] {
  return events.filter((e) => !e.isReplay);
}

/** Board, pass and alight events, oldest first. */
export function ridden(events: readonly RideEvent[]): RideEvent[] {
  return events
    .filter((e) => e.event !== "on_train")
    .sort((a, b) => a.ts.getTime() - b.ts.getTime());
}

/** Maps station IDs and their platform stop IDs to the station ID. */
export function stationIndex(stations: readonly Station[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const station of stations) {
    index.set(station.id, station.id);
    for (const stop of station.stops) index.set(stop, station.id);
  }
  return index;
}

export type Ride = { routeId: string; from: string; to: string };

/**
 * One profile's rides, one per board event: it runs to the last pass or alight event of the same trip that
 * follows it, and ends at an alight. Events without a known station are skipped.
 */
export function ridesOf(events: readonly RideEvent[], index: ReadonlyMap<string, string>): Ride[] {
  const rides: Ride[] = [];
  let open: (Ride & { tripId: string | null }) | null = null;
  for (const e of ridden(events)) {
    const station = e.stopId === null ? undefined : index.get(e.stopId);
    if (station === undefined) continue;
    if (e.event === "board") {
      open = { routeId: e.routeId, tripId: e.tripId, from: station, to: station };
      rides.push(open);
    } else if (open && open.tripId === e.tripId) {
      open.to = station;
      if (e.event === "alight") open = null;
    }
  }
  return rides.map(({ routeId, from, to }) => ({ routeId, from, to }));
}

export function nearestStation(stations: readonly Station[], point: LatLon): string {
  let best = stations[0];
  if (!best) throw new Error("No stations to search");
  let bestM = haversineM(best, point);
  for (const station of stations) {
    const meters = haversineM(station, point);
    if (meters < bestM) [best, bestM] = [station, meters];
  }
  return best.id;
}

/**
 * Stations boarded, passed or alighted at on live rides, plus the station nearest to each valid
 * check-in (DATA 3.10, 50 Stations).
 */
export function stationsVisited(
  stations: readonly Station[],
  events: readonly RideEvent[],
  checkins: readonly (LatLon & { valid: boolean })[],
): Set<string> {
  const index = stationIndex(stations);
  const visited = new Set<string>();
  for (const e of ridden(live(events))) {
    const station = e.stopId === null ? undefined : index.get(e.stopId);
    if (station !== undefined) visited.add(station);
  }
  for (const c of checkins) if (c.valid) visited.add(nearestStation(stations, c));
  return visited;
}

export const lastTrainGraceMs = 10 * 60_000;

/** The first train of a person's last-train trip home (DATA 3.3): its departure and trip ID. */
export type LastTrainHome = { departs: Date; tripId: string };

/**
 * When to look for a person's ride home: the later of the last stop's scheduled time and their
 * last valid check-in, so neither the ride to the plan nor a ride between crawl stops counts.
 * Null when they never checked in.
 */
export function rideHomeStart(lastStopAt: Date, checkins: readonly Date[]): Date | null {
  if (checkins.length === 0) return null;
  return new Date(Math.max(lastStopAt.getTime(), ...checkins.map((c) => c.getTime())));
}

/**
 * How much time one person had to spare on their ride home, in ms, or null when they didn't
 * catch the last train (DATA 3.10, 3.11). The ride home is their first live "I'm on the train"
 * tap or board event from `after` (see `rideHomeStart`). Before the departure it counts with the
 * time left. Up to 10 minutes after, it counts with 0 to spare when it's the last train's trip or
 * a tap without a trip, because the last train often runs late and people tap once seated
 * (D-059). Pass the profile's events from `after` on, with or without the plan's ID.
 */
export function lastTrainMargin(
  events: readonly RideEvent[],
  after: Date,
  lastTrain: LastTrainHome,
): number | null {
  let boarded: RideEvent | null = null;
  for (const e of live(events)) {
    if ((e.event !== "on_train" && e.event !== "board") || e.ts < after) continue;
    if (boarded === null || e.ts < boarded.ts) boarded = e;
  }
  if (boarded === null) return null;
  const margin = lastTrain.departs.getTime() - boarded.ts.getTime();
  if (margin > 0) return margin;
  if (margin < -lastTrainGraceMs) return null;
  return boarded.tripId === null || boarded.tripId === lastTrain.tripId ? 0 : null;
}
