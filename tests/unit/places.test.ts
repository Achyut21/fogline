import { describe, expect, it } from "vitest";
import { placeSchema } from "@/lib/places/types";
import type { Station } from "@/lib/gtfs/types";
import { merge, tiles, type OsmElement } from "../../scripts/places/osm";
import { isAdult, kindOf, toPlaces } from "../../scripts/places/transform";

const station = (id: string, lat: number, lon: number): Station => ({
  id,
  name: id,
  lat,
  lon,
  routes: ["Red"],
  stops: [],
});
const stations = [
  station("place-pktrm", 42.356395, -71.062424),
  station("place-dwnxg", 42.355518, -71.060225),
  station("place-harsq", 42.373362, -71.118956),
];
const metersPerDegreeLat = 111_195;

function node(id: number, tags: Record<string, string>, lat = 42.3566, lon = -71.0622): OsmElement {
  return { type: "node", id, lat, lon, tags };
}

describe("kindOf", () => {
  it("reads amenity first, then tourism, then leisure, and ignores other kinds", () => {
    expect(kindOf({ amenity: "cafe" })).toBe("cafe");
    expect(kindOf({ amenity: "library", tourism: "museum" })).toBe("museum");
    expect(kindOf({ leisure: "park" })).toBe("park");
    expect(kindOf({ amenity: "parking" })).toBeNull();
  });
});

describe("toPlaces", () => {
  it("[F4.5] lists every station within 600 m walking, nearest first, and drops spots near none", () => {
    const places = toPlaces(
      [
        node(1, { name: "Tatte", amenity: "cafe" }),
        node(2, { name: "Far Away Cafe", amenity: "cafe" }, 42.3, -71.0),
      ],
      stations,
    );
    expect(places.map((p) => p.id)).toEqual(["osm:node/1"]);
    expect(places[0].stations.map((s) => s.id)).toEqual(["place-pktrm", "place-dwnxg"]);
    expect(places[0].stations[0].walkM).toBeLessThan(places[0].stations[1].walkM);
  });

  it("[F4.5] keeps a spot exactly 600 m on foot from a station and drops one a meter past", () => {
    const north = (walk: number) => 42.373362 + walk / 1.25 / metersPerDegreeLat;
    const places = toPlaces(
      [
        node(1, { name: "Edge", amenity: "cafe" }, north(599.5), -71.118956),
        node(2, { name: "Past", amenity: "cafe" }, north(601), -71.118956),
      ],
      stations,
    );
    expect(places.map((p) => [p.name, p.stations[0]?.walkM])).toEqual([["Edge", 600]]);
  });

  it("[F1.5] makes bars, pubs, beer gardens and nightclubs 21+, and nothing else", () => {
    const places = toPlaces(
      ["bar", "pub", "biergarten", "nightclub", "restaurant", "theatre"].map((amenity, i) =>
        node(i + 1, { name: `${amenity} ${i}`, amenity }),
      ),
      stations,
    );
    expect(places.map((p) => [p.category, p.ageRule])).toEqual([
      ["bar", "21plus"],
      ["bar", "21plus"],
      ["bar", "21plus"],
      ["club", "21plus"],
      ["food", "all"],
      ["culture", "all"],
    ]);
    expect(places.every((p) => placeSchema.safeParse(p).success)).toBe(true);
  });

  it("[F4.5] prices fast food, food courts, ice cream and cafes at $ and leaves the rest unknown", () => {
    const places = toPlaces(
      ["fast_food", "food_court", "ice_cream", "cafe", "restaurant", "bar"].map((amenity, i) =>
        node(i + 1, { name: `${amenity} ${i}`, amenity }),
      ),
      stations,
    );
    expect(places.map((p) => p.price)).toEqual([1, 1, 1, 1, null, null]);
  });

  it("keeps hours and the address, uses a building's center, and skips unnamed spots", () => {
    const places = toPlaces(
      [
        {
          type: "way",
          id: 7,
          center: { lat: 42.3566, lon: -71.0622 },
          tags: {
            name: "Teele Square Pizza",
            amenity: "restaurant",
            opening_hours: "Mo-Su 11:00-23:00",
            "addr:housenumber": "1",
            "addr:street": "Tremont Street",
          },
        },
        node(8, { amenity: "restaurant" }),
        { type: "relation", id: 9, tags: { name: "No Coordinates", leisure: "park" } },
      ],
      stations,
    );
    expect(places).toEqual([
      expect.objectContaining({
        id: "osm:way/7",
        lat: 42.3566,
        lon: -71.0622,
        hours: "Mo-Su 11:00-23:00",
        address: { number: "1", street: "Tremont Street" },
        grade: null,
      }),
    ]);
  });

  it("[F1.5] makes restaurants that are bars in practice 21+, by name, brewery tags or review", () => {
    const adult = (name: string, tags: Record<string, string> = {}) => isAdult("food", name, tags);
    expect(adult("Beantown Pub")).toBe(true);
    expect(adult("Dive Bar")).toBe(true);
    expect(adult("Tip Tap Room")).toBe(true);
    expect(adult("Democracy Brewing")).toBe(true);
    expect(adult("21st Amendment")).toBe(true);
    expect(adult("Hurricane's at the Garden")).toBe(true);
    expect(adult("Lamplighter", { microbrewery: "yes" })).toBe(true);
    expect(adult("Island Creek Oyster Bar")).toBe(false);
    expect(adult("Pressed Juice Bar")).toBe(false);
    expect(adult("Barcelona")).toBe(false);
    expect(adult("Tatte Bakery")).toBe(false);
    expect(isAdult("club", "Royale", {})).toBe(true);
    expect(adult("Lolita", { min_age: "21" })).toBe(true);
    expect(adult("Lolita")).toBe(true);
    expect(adult("Teatro", { min_age: "18" })).toBe(false);
    expect(adult("Habibi's Lounge")).toBe(true);
    expect(adult("Sahara", { cuisine: "lebanese; hookah" })).toBe(true);
    expect(adult("Tap 151")).toBe(true);
    expect(adult("Mike's Food & Spirits")).toBe(true);
    expect(adult("Club Café")).toBe(true);
    expect(adult("Juliet Social Club")).toBe(false);
    expect(adult("Pub & Oyster Bar")).toBe(true);
  });

  it("[F1.5] keeps a spot 21+ when the copy dropped as a duplicate was", () => {
    const places = toPlaces(
      [
        node(1, { name: "The Banshee", amenity: "pub" }),
        {
          type: "way",
          id: 2,
          center: { lat: 42.3567, lon: -71.0623 },
          tags: { name: "The Banshee", amenity: "restaurant", cuisine: "irish", website: "x" },
        },
      ],
      stations,
    );
    expect(places.map((p) => [p.id, p.category, p.ageRule])).toEqual([
      ["osm:way/2", "food", "21plus"],
    ]);
  });

  it("keeps one copy of a spot mapped twice within 50 m, the one with more tags", () => {
    const places = toPlaces(
      [
        node(1, { name: "Boston Common", leisure: "park" }),
        {
          type: "way",
          id: 2,
          center: { lat: 42.3567, lon: -71.0623 },
          tags: { name: "Boston Common", leisure: "park", wikidata: "Q1" },
        },
        node(3, { name: "Boston Common", leisure: "park" }, 42.3555, -71.0605),
      ],
      stations,
    );
    expect(places.map((p) => p.id)).toEqual(["osm:node/3", "osm:way/2"]);
  });
});

describe("Overpass tiles", () => {
  it("cuts the box into 9 tiles that cover it edge to edge", () => {
    const box = { south: 42.2, west: -71.3, north: 42.5, east: -71.0 };
    const parts = tiles(box);
    expect(parts).toHaveLength(9);
    expect(Math.min(...parts.map((t) => t.south))).toBe(box.south);
    expect(Math.max(...parts.map((t) => t.north))).toBeCloseTo(box.north, 12);
    expect(Math.min(...parts.map((t) => t.west))).toBe(box.west);
    expect(Math.max(...parts.map((t) => t.east))).toBeCloseTo(box.east, 12);
    const area = parts.reduce((sum, t) => sum + (t.north - t.south) * (t.east - t.west), 0);
    expect(area).toBeCloseTo((box.north - box.south) * (box.east - box.west), 12);
  });

  it("keeps each element once across overlapping tiles, with the oldest data date", () => {
    const a = node(1, { name: "Tatte", amenity: "cafe" });
    const b = node(2, { name: "Flour", amenity: "cafe" });
    const merged = merge([
      { osm3s: { timestamp_osm_base: "2026-11-22T02:10:00Z" }, elements: [a, b] },
      { osm3s: { timestamp_osm_base: "2026-11-22T02:09:00Z" }, elements: [b] },
    ]);
    expect(merged.elements.map((e) => e.id)).toEqual([1, 2]);
    expect(merged.osm3s.timestamp_osm_base).toBe("2026-11-22T02:09:00Z");
  });
});
