import { haversineM, walkM } from "@/lib/geo/distance";
import { normalizeName } from "@/lib/grades";
import type { Station } from "@/lib/gtfs/types";
import type { Place, PlaceCategory } from "@/lib/places/types";
import type { OsmElement } from "./osm";

const categories: Record<string, PlaceCategory> = {
  restaurant: "food",
  fast_food: "food",
  food_court: "food",
  cafe: "coffee",
  ice_cream: "dessert",
  bar: "bar",
  pub: "bar",
  biergarten: "bar",
  nightclub: "club",
  arts_centre: "culture",
  theatre: "culture",
  cinema: "culture",
  museum: "culture",
  gallery: "culture",
  park: "park",
};

// OpenStreetMap rarely tags prices. These kinds are "$" by what they are (D-057); every other
// spot's price stays unknown.
const inexpensive = new Set(["fast_food", "food_court", "ice_cream", "cafe"]);

const maxWalkM = 600;
const duplicateM = 50;

/** The OSM kind that decides a spot's category: amenity first, then tourism, then leisure. */
export function kindOf(tags: Record<string, string>): string | null {
  for (const key of ["amenity", "tourism", "leisure"]) {
    const value = tags[key];
    if (value !== undefined && value in categories) return value;
  }
  return null;
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

const typeOrder = { node: 0, way: 1, relation: 2 } as const;

/**
 * Named OSM spots within 600 m walking of a station (DATA 2.2), each with every such station,
 * nearest first. A spot mapped twice (a point and its building) within 50 m under the same name
 * is kept once, preferring the copy with more tags.
 */
export function toPlaces(elements: OsmElement[], stations: Station[]): Place[] {
  const candidates: { place: Place; tags: number; order: number }[] = [];
  for (const element of elements) {
    const name = element.tags.name?.trim();
    const kind = kindOf(element.tags);
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!name || !kind || lat === undefined || lon === undefined) continue;
    const near = stations
      .map((s) => ({ id: s.id, walkM: Math.round(walkM({ lat, lon }, s)) }))
      .filter((s) => s.walkM <= maxWalkM)
      .sort((a, b) => a.walkM - b.walkM || (a.id < b.id ? -1 : 1));
    if (near.length === 0) continue;
    const category = categories[kind];
    const number = element.tags["addr:housenumber"];
    const street = element.tags["addr:street"];
    candidates.push({
      place: {
        id: `osm:${element.type}/${element.id}`,
        name,
        category,
        lat: round(lat),
        lon: round(lon),
        stations: near,
        address: number && street ? { number, street } : null,
        ageRule: category === "bar" || category === "club" ? "21plus" : "all",
        price: inexpensive.has(kind) ? 1 : null,
        hours: element.tags.opening_hours ?? null,
        grade: null,
      },
      tags: Object.keys(element.tags).length,
      order: typeOrder[element.type],
    });
  }

  candidates.sort(
    (a, b) =>
      b.tags - a.tags ||
      a.order - b.order ||
      (a.place.id < b.place.id ? -1 : a.place.id > b.place.id ? 1 : 0),
  );
  const kept: Place[] = [];
  const byName = new Map<string, Place[]>();
  for (const { place } of candidates) {
    const key = normalizeName(place.name);
    const same = byName.get(key) ?? [];
    if (same.some((other) => haversineM(other, place) <= duplicateM)) continue;
    same.push(place);
    byName.set(key, same);
    kept.push(place);
  }
  return kept.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
