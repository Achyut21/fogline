import { cumulativeMeters } from "@/lib/geo/along";
import type { ShapeLine } from "@/lib/gtfs/types";
import type { vehiclePositions } from "@/server/db/schema";
import { data } from "@/server/data";

/** The point this many meters along a shape. */
export function pointAt(line: ShapeLine, meters: number) {
  const cumulative = cumulativeMeters(line.points);
  const i = Math.max(0, cumulative.findIndex((m) => m >= meters) - 1);
  const share = (meters - cumulative[i]) / (cumulative[i + 1] - cumulative[i]);
  const [lat1, lon1] = line.points[i];
  const [lat2, lon2] = line.points[i + 1];
  return { lat: lat1 + share * (lat2 - lat1), lon: lon1 + share * (lon2 - lon1) };
}

/**
 * Recorder rows for one train moving at an even speed from `fromM` to `toM` along a shape, one
 * a minute, like `/api/cron/record-vehicles` writes them. Each row names the stop it heads for.
 */
export function recordedTripRows(
  line: ShapeLine,
  trip: { id: string; start: Date; fromM: number; toM: number; minutes: number },
): (typeof vehiclePositions.$inferInsert)[] {
  return Array.from({ length: trip.minutes + 1 }, (_, minute) => {
    const meters = trip.fromM + ((trip.toM - trip.fromM) * minute) / trip.minutes;
    const ahead = line.stops.find((s) => s.meters >= meters - 150) ?? line.stops.at(-1);
    const stop = ahead ? data.stations().find((s) => s.id === ahead.station)?.stops[0] : undefined;
    return {
      ts: new Date(trip.start.getTime() + minute * 60_000),
      vehicleId: `test-${trip.id}`,
      tripId: trip.id,
      routeId: line.route,
      directionId: line.direction,
      stopId: stop ?? null,
      currentStatus: "IN_TRANSIT_TO",
      ...pointAt(line, meters),
    };
  });
}
