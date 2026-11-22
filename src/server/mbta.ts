import { z } from "zod";
import type { vehiclePositions } from "@/server/db/schema";

// MBTA's realtime vehicle feed (DATA section 1, no key). The recorder keeps subway trains only.
export const vehicleFeedUrl = "https://cdn.mbta.com/realtime/VehiclePositions_enhanced.json";

const subway = /^(Red|Orange|Blue|Mattapan|Green-[BCDE])$/;

const entitySchema = z.object({
  id: z.string(),
  vehicle: z
    .object({
      current_status: z.string().optional(),
      multi_carriage_details: z.array(z.unknown()).optional(),
      position: z.object({
        bearing: z.number().optional(),
        latitude: z.number(),
        longitude: z.number(),
      }),
      stop_id: z.string().optional(),
      timestamp: z.number().int(),
      trip: z.object({
        trip_id: z.string().optional(),
        route_id: z.string(),
        direction_id: z.number().int().optional(),
      }),
      vehicle: z.object({ id: z.string() }).optional(),
    })
    .optional(),
});
const feedSchema = z.object({ entity: z.array(z.unknown()) });

export type VehicleRow = typeof vehiclePositions.$inferInsert;

/**
 * One row per subway train in the feed, timestamped by the train's own report. An entity that
 * doesn't parse is counted and skipped, so one bad train doesn't lose the minute.
 */
export function vehicleRows(feed: unknown): { rows: VehicleRow[]; skipped: number } {
  const rows: VehicleRow[] = [];
  let skipped = 0;
  for (const raw of feedSchema.parse(feed).entity) {
    const parsed = entitySchema.safeParse(raw);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const entity = parsed.data;
    const v = entity.vehicle;
    if (!v || !subway.test(v.trip.route_id)) continue;
    rows.push({
      ts: new Date(v.timestamp * 1000),
      vehicleId: v.vehicle?.id ?? entity.id,
      tripId: v.trip.trip_id ?? null,
      routeId: v.trip.route_id,
      directionId: v.trip.direction_id ?? null,
      stopId: v.stop_id ?? null,
      currentStatus: v.current_status ?? null,
      lat: v.position.latitude,
      lon: v.position.longitude,
      bearing: v.position.bearing ?? null,
      occupancy: v.multi_carriage_details ?? null,
    });
  }
  return { rows, skipped };
}
