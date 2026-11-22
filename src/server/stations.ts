import { z } from "zod";
import { stationSchema, type Station } from "@/lib/gtfs/types";
import raw from "../../data/stations.json";

export const stations: readonly Station[] = z.array(stationSchema).parse(raw);

const byId = new Map(stations.map((s) => [s.id, s]));

export function stationById(id: string): Station | undefined {
  return byId.get(id);
}

const byStop = new Map(stations.flatMap((s) => s.stops.map((stop) => [stop, s.id] as const)));
const byName = new Map(stations.map((s) => [s.name, s.id]));

/**
 * The parent station of a platform or child stop ID from the realtime feeds. A train waiting at
 * a terminal is given its track ("Alewife-01", "Forest Hills-02"), which the schedule never
 * uses, so a track ID maps to the station it is named after.
 */
export function stationOfStop(stop: string): string | undefined {
  return byStop.get(stop) ?? byName.get(stop.replace(/-\d{2}$/, ""));
}
