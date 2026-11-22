import type { StationCard } from "@/lib/cards";
import type { Place } from "@/lib/places/types";
import { travelTimesFrom } from "@/lib/solver/travel";
import { dayTypeOf, hourBucketOf, toServiceTime } from "@/lib/time";
import { data } from "@/server/data";

// The parts of a station sheet that don't change minute to minute (F2.5): how far it is from
// home by T, its nearest spots, and its stop card once the station is uncovered (F3.3).

const spotsShown = 3;

export type SheetSpot = {
  id: string;
  name: string;
  category: Place["category"];
  walkM: number;
  grade: string | null;
};

let byStation: Map<string, (Place & { walkM: number })[]> | null = null;

function placesNear(station: string) {
  if (!byStation) {
    byStation = new Map();
    for (const place of data.places()) {
      for (const s of place.stations) {
        const list = byStation.get(s.id) ?? [];
        list.push({ ...place, walkM: s.walkM });
        byStation.set(s.id, list);
      }
    }
    for (const list of byStation.values()) list.sort((a, b) => a.walkM - b.walkM);
  }
  return byStation.get(station) ?? [];
}

/** The nearest spots by walk, without 21+ spots for anyone not known to be 21+ (F1.5). */
export function nearbySpots(station: string, adult: boolean): SheetSpot[] {
  return placesNear(station)
    .filter((p) => adult || p.ageRule === "all")
    .slice(0, spotsShown)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      walkM: p.walkM,
      grade: p.grade?.letter ?? null,
    }));
}

// The subway runs from about 05:00 to about 01:00 (25:00 in service time). Outside that the
// solver's buckets still return times, so the sheet makes no claim then.
const serviceStart = 5 * 3600;
const serviceEnd = 25 * 3600;

/** Whole minutes by T from home to every station it reaches now (DATA 3.1), none overnight. */
export function minutesFromHome(home: string, at: Date): Map<string, number> {
  const { serviceDate, seconds } = toServiceTime(at);
  if (seconds < serviceStart || seconds >= serviceEnd) return new Map();
  const times = travelTimesFrom(data.graph(), home, dayTypeOf(serviceDate), hourBucketOf(seconds));
  return new Map([...times].map(([id, t]) => [id, Math.round(t.seconds / 60)]));
}

export type SheetCard = Pick<StationCard, "story" | "image">;

export function stopCard(station: string): SheetCard | null {
  const card = data.cards().find((c) => c.station === station);
  return card?.story ? { story: card.story, image: card.image } : null;
}
