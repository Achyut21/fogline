import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { rideMiles } from "@/lib/geo/miles";
import { rideStops, shapeFor, stationTimes, type RideStop } from "@/lib/replay";
import type { Db } from "@/server/db/client";
import { vehiclePositions } from "@/server/db/schema";
import { data } from "./data";
import { stationById, stationOfStop } from "./stations";

// Recorded trips for replay (F3.5): the recorder's vehicle_positions rows, one a minute, turned
// into the stops a rider passes from a station.

const lookbackMs = 24 * 60 * 60_000;
const tripsListed = 8;
const candidates = 40;
// Board plus three more stops, so a replay shows at least three stop cards.
const minStops = 4;

export type RecordedRide = {
  tripId: string;
  route: string;
  direction: 0 | 1;
  stops: RideStop[];
  miles: number | null;
};

type Row = { tripId: string; route: string; direction: number | null; samples: Sample[] };
type Sample = { ts: Date; lat: number; lon: number; stopId: string | null };

const direction = (value: number | null): 0 | 1 | null =>
  value === 0 || value === 1 ? value : null;

function rideOf(row: Row, from: string): RecordedRide | null {
  const dir = direction(row.direction);
  if (dir === null) return null;
  const seen = row.samples.flatMap((s) => {
    const station = s.stopId ? stationOfStop(s.stopId) : undefined;
    return station ? [station] : [];
  });
  const shapes = data.shapes();
  const line = shapeFor(shapes, row.route, dir, from, seen);
  if (!line) return null;
  const stops = rideStops(stationTimes(row.samples, line), from);
  if (stops.length < minStops) return null;
  const last = stops[stops.length - 1].station;
  return {
    tripId: row.tripId,
    route: row.route,
    direction: dir,
    stops,
    miles: rideMiles(shapes, row.route, from, last),
  };
}

async function rows(db: Db, where: ReturnType<typeof and>): Promise<Row[]> {
  const found = await db
    .select({
      tripId: vehiclePositions.tripId,
      route: vehiclePositions.routeId,
      direction: vehiclePositions.directionId,
      ts: vehiclePositions.ts,
      lat: vehiclePositions.lat,
      lon: vehiclePositions.lon,
      stopId: vehiclePositions.stopId,
    })
    .from(vehiclePositions)
    .where(where)
    .orderBy(vehiclePositions.ts);
  const byTrip = new Map<string, Row>();
  for (const r of found) {
    if (!r.tripId) continue;
    const row = byTrip.get(r.tripId) ?? {
      tripId: r.tripId,
      route: r.route,
      direction: r.direction,
      samples: [],
    };
    row.samples.push({ ts: r.ts, lat: r.lat, lon: r.lon, stopId: r.stopId });
    byTrip.set(r.tripId, row);
  }
  return [...byTrip.values()];
}

/** The latest recorded trips that leave `from` and pass at least three more stops, newest first. */
export async function recordedRides(
  db: Db,
  from: string,
  now = new Date(),
): Promise<RecordedRide[]> {
  const station = stationById(from);
  if (!station) return [];
  const since = new Date(now.getTime() - lookbackMs);
  const recent = await db
    .select({ tripId: vehiclePositions.tripId })
    .from(vehiclePositions)
    .where(
      and(
        gte(vehiclePositions.ts, since),
        isNotNull(vehiclePositions.tripId),
        inArray(vehiclePositions.routeId, station.routes),
        inArray(vehiclePositions.stopId, station.stops),
      ),
    )
    .groupBy(vehiclePositions.tripId)
    .orderBy(desc(sql`max(${vehiclePositions.ts})`))
    .limit(candidates);
  const ids = recent.flatMap((r) => (r.tripId ? [r.tripId] : []));
  if (ids.length === 0) return [];
  const trips = await rows(
    db,
    and(gte(vehiclePositions.ts, since), inArray(vehiclePositions.tripId, ids)),
  );
  return trips
    .flatMap((row) => rideOf(row, from) ?? [])
    .sort((a, b) => b.stops[0].at.getTime() - a.stops[0].at.getTime())
    .slice(0, tripsListed);
}

/** One recorded trip as a ride from `from`, or null when it doesn't make one. */
export async function recordedRide(
  db: Db,
  tripId: string,
  from: string,
  now = new Date(),
): Promise<RecordedRide | null> {
  const since = new Date(now.getTime() - lookbackMs);
  const [row] = await rows(
    db,
    and(gte(vehiclePositions.ts, since), eq(vehiclePositions.tripId, tripId)),
  );
  return row ? rideOf(row, from) : null;
}
