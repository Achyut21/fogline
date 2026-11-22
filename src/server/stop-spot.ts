import { createHash } from "node:crypto";
import { data } from "@/server/data";

export type StopSpot = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  ageRule: "all" | "21plus";
  /** Walking meters from the stop's station, or null when the spot isn't near it. */
  walkM: number | null;
};

/**
 * Where a plan stop is (ARCHITECTURE section 6): a spot from places.json, or, for Dinner before
 * and weekly plans, a puzzle event's venue from events.json. Events are all-ages, and only the
 * venue leaves the server, never the puzzle word.
 */
export function stopSpot(placeId: string, stationId: string): StopSpot | null {
  const place = data.places().find((p) => p.id === placeId);
  if (place) {
    return {
      id: place.id,
      name: place.name,
      lat: place.lat,
      lon: place.lon,
      ageRule: place.ageRule,
      walkM: place.stations.find((s) => s.id === stationId)?.walkM ?? null,
    };
  }
  const event = data.events().find((e) => e.id === placeId);
  if (!event) return null;
  return {
    // Event IDs spell out the date and title of a puzzle answer, so the client gets a hash.
    id: `event-${createHash("sha256").update(event.id).digest("hex").slice(0, 12)}`,
    name: event.venue,
    lat: event.lat,
    lon: event.lon,
    ageRule: "all",
    walkM: event.station.id === stationId ? event.station.walkM : null,
  };
}
