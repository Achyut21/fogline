import { z } from "zod";

// MBTA TripUpdates (DATA section 1, no key) cut down to what a station sheet needs (F2.5, F3.1):
// subway revenue trips that still run, each with its remaining stops and when it leaves them.

const subway = /^(Red|Orange|Blue|Mattapan|Green-[BCDE])$/;

const stopTimeSchema = z.object({
  stop_id: z.string(),
  schedule_relationship: z.string().optional(),
  arrival: z.object({ time: z.number().int() }).optional(),
  departure: z.object({ time: z.number().int() }).optional(),
});

const entitySchema = z.object({
  trip_update: z.object({
    trip: z.object({
      route_id: z.string(),
      direction_id: z.union([z.literal(0), z.literal(1)]),
      revenue: z.boolean().optional(),
      schedule_relationship: z.string().optional(),
    }),
    stop_time_update: z.array(stopTimeSchema),
  }),
});

const feedSchema = z.object({
  header: z.object({ timestamp: z.number().int() }),
  entity: z.array(z.unknown()),
});

export type Trip = {
  route: string;
  direction: 0 | 1;
  /** Stops still ahead, in order. `departs` is in Unix seconds, null where the trip ends. */
  stops: { stop: string; departs: number | null }[];
};

export type Trips = { updatedAt: number; trips: Trip[] };

/**
 * Reads the feed. An entity this code can't read is skipped rather than failing the whole feed,
 * and so are non-revenue trips, canceled trips and skipped stops.
 */
export function parseTrips(feed: unknown): Trips {
  const { header, entity } = feedSchema.parse(feed);
  const trips: Trip[] = [];
  for (const raw of entity) {
    const parsed = entitySchema.safeParse(raw);
    if (!parsed.success) continue;
    const { trip, stop_time_update: updates } = parsed.data.trip_update;
    if (!subway.test(trip.route_id) || trip.revenue === false) continue;
    if (trip.schedule_relationship === "CANCELED") continue;
    const kept = updates.filter((u) => u.schedule_relationship !== "SKIPPED");
    trips.push({
      route: trip.route_id,
      direction: trip.direction_id,
      stops: kept.map((u, i) => ({
        stop: u.stop_id,
        departs: u.departure?.time ?? (i < kept.length - 1 ? (u.arrival?.time ?? null) : null),
      })),
    });
  }
  return { updatedAt: header.timestamp, trips };
}

export type Departure = {
  route: string;
  direction: 0 | 1;
  /** The station the trip ends at. */
  destination: string;
  /** Unix seconds. */
  departs: number;
};

/** Green Line branches share a direction name at a station, so they share a cap. */
const lineOf = (route: string) => (route.startsWith("Green") ? "Green" : route);

/**
 * The next trains leaving a station, soonest first, at most `perDirection` for each line and
 * direction. A trip that ends at the station isn't a departure, and neither is one that already
 * left. `stationOf` maps the feed's stop IDs, terminal tracks included, to stations.
 */
export function departuresFrom(
  trips: readonly Trip[],
  station: string,
  stationOf: (stop: string) => string | undefined,
  now: number,
  perDirection = 3,
): Departure[] {
  const found: Departure[] = [];
  for (const trip of trips) {
    const here = trip.stops.find((s) => stationOf(s.stop) === station);
    const end = trip.stops.at(-1);
    if (!here || here.departs === null || here.departs < now || !end) continue;
    const destination = stationOf(end.stop);
    if (!destination || destination === station) continue;
    found.push({
      route: trip.route,
      direction: trip.direction,
      destination,
      departs: here.departs,
    });
  }
  found.sort((a, b) => a.departs - b.departs);
  const taken = new Map<string, number>();
  return found.filter((d) => {
    const key = `${lineOf(d.route)}-${d.direction}`;
    const count = taken.get(key) ?? 0;
    taken.set(key, count + 1);
    return count < perDirection;
  });
}

/** What /api/mbta/predictions answers; `updatedAt` is the feed's own time in Unix seconds. */
export const predictionsSchema = z.object({
  station: z.string(),
  updatedAt: z.number().int(),
  departures: z.array(
    z.object({
      route: z.string(),
      direction: z.union([z.literal(0), z.literal(1)]),
      destination: z.string(),
      departs: z.number().int(),
    }),
  ),
});
export type Predictions = z.infer<typeof predictionsSchema>;
