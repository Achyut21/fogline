import { walkM, type LatLon } from "@/lib/geo/distance";
import { rideMiles } from "@/lib/geo/miles";
import type { ShapeLine } from "@/lib/gtfs/types";
import {
  lastTrainMargin,
  lineOf,
  lines,
  ridden,
  rideHomeStart,
  ridesOf,
  type LastTrainHome,
  type Line,
  type RideEvent,
} from "@/lib/rides";

// Stats for a ride, a night or a lifetime are these functions applied to that scope's rows
// (F8.3, DATA 3.11). A ride's summary passes its own events, replay or not (F3.5); night and
// lifetime totals pass `live(events)`. Percent uncovered is `bostonShare` in
// `src/lib/geo/regions.ts`.

/** Miles on the T: each ride's miles to 0.1 mi, summed, so the total matches the ride summaries. */
export function milesOnT(
  shapes: ShapeLine[],
  index: ReadonlyMap<string, string>,
  events: readonly RideEvent[],
): number {
  const tenths = ridesOf(events, index).reduce(
    (sum, ride) =>
      sum + Math.round((rideMiles(shapes, ride.routeId, ride.from, ride.to) ?? 0) * 10),
    0,
  );
  return tenths / 10;
}

/** Board, pass and alight events. */
export function stopsCount(events: readonly RideEvent[]): number {
  return ridden(events).length;
}

/** Lines boarded, in the order of `lines`. */
export function linesRidden(events: readonly RideEvent[]): Line[] {
  const boarded = new Set(
    ridden(events)
      .filter((e) => e.event === "board")
      .map((e) => lineOf(e.routeId)),
  );
  return lines.filter((line) => boarded.has(line));
}

/**
 * A stop of a night in order. `walkedFromPrevious` is false for the first stop; for later crawl
 * stops it comes from how the crawl builder (F10) planned the leg (DATA 3.11).
 */
export type NightStop = {
  station: LatLon;
  spot: LatLon;
  checkedIn: boolean;
  walkedFromPrevious: boolean;
};

/**
 * Meters walked on one person's night, about: each stop with a valid check-in adds the walk from
 * its station and back. A walk between two checked-in stops replaces the walk back to the station
 * from the first and the walk from the station to the second (D-063). Sum nights in meters and
 * convert once with `toMiles`.
 */
export function metersWalked(stops: readonly NightStop[]): number {
  let meters = 0;
  stops.forEach((stop, i) => {
    if (!stop.checkedIn) return;
    const previous = stops[i - 1];
    const next = stops[i + 1];
    meters +=
      stop.walkedFromPrevious && previous?.checkedIn
        ? walkM(previous.spot, stop.spot)
        : walkM(stop.station, stop.spot);
    if (!(next?.walkedFromPrevious && next.checkedIn)) meters += walkM(stop.spot, stop.station);
  });
  return meters;
}

/** Ended plans with a valid check-in by the profile. */
export function nightsOut(
  checkins: readonly { planId: string; valid: boolean }[],
  endedPlans: ReadonlySet<string>,
): number {
  return new Set(checkins.filter((c) => c.valid && endedPlans.has(c.planId)).map((c) => c.planId))
    .size;
}

/** Whether a night counts toward "last trains caught" (DATA 3.11, `lastTrainMargin`). */
export function caughtLastTrain(
  events: readonly RideEvent[],
  lastStopAt: Date,
  checkins: readonly Date[],
  lastTrain: LastTrainHome,
): boolean {
  const after = rideHomeStart(lastStopAt, checkins);
  return after !== null && lastTrainMargin(events, after, lastTrain) !== null;
}
