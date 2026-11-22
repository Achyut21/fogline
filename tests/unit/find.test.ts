import { describe, expect, it } from "vitest";
import { matchPlaces, nameKey, parseGrounded } from "@/lib/find";
import type { Place } from "@/lib/places/types";

const place = (over: Partial<Place>): Place => ({
  id: "osm:1",
  name: "Gene's Chinese Flatbread Cafe",
  category: "food",
  lat: 42.35,
  lon: -71.06,
  stations: [{ id: "place-dwnxg", walkM: 200 }],
  address: null,
  ageRule: "all",
  price: 1,
  hours: null,
  grade: null,
  ...over,
});

describe("find it and taste of home", () => {
  it("[F14.2] keeps only places that come with a review quote", () => {
    const text = [
      "1. Gene's Chinese Flatbread Cafe | \"The hand-pulled noodles taste like Xi'an.\"",
      "2. Some Place |",
      "Intro line without a separator",
      '- Bell in Hand Tavern | "Great pints."',
    ].join("\n");
    expect(parseGrounded(text)).toEqual([
      { name: "Gene's Chinese Flatbread Cafe", quote: "The hand-pulled noodles taste like Xi'an." },
      { name: "Bell in Hand Tavern", quote: "Great pints." },
    ]);
  });

  it("[F14.1] matches names to known spots near the T, at most three", () => {
    expect(nameKey("The Gene’s Chinese Flatbread Café")).toBe(
      nameKey("Gene's Chinese Flatbread Cafe"),
    );
    const places = [
      place({}),
      place({ id: "osm:2", name: "Far Away Diner", stations: [] }),
      ...[3, 4, 5].map((n) => place({ id: `osm:${n}`, name: `Spot ${n}` })),
    ];
    const found = [
      { name: "Far Away Diner", quote: "q" },
      { name: "Unknown Noodle Bar", quote: "q" },
      { name: "Gene's Chinese Flatbread Cafe", quote: "q1" },
      { name: "Spot 3", quote: "q" },
      { name: "Spot 4", quote: "q" },
      { name: "Spot 5", quote: "q" },
    ];
    const matched = matchPlaces(found, places, { under21: false, minGrade: null, budget: null });
    expect(matched.map((m) => m.place.id)).toEqual(["osm:1", "osm:3", "osm:4"]);
    expect(matched[0].quote).toBe("q1");
  });

  it("[F14.3] applies the age, grade and budget rules", () => {
    const bar = place({ id: "osm:bar", name: "Bell in Hand", category: "bar", ageRule: "21plus" });
    const pricey = place({ id: "osm:p", name: "Pricey", price: 3 });
    const graded = place({
      id: "osm:g",
      name: "Graded",
      grade: { letter: "C", date: "2026-04-09", points: 40, license: "1", violations: [] },
    });
    const found = ["Bell in Hand", "Pricey", "Graded"].map((name) => ({ name, quote: "q" }));
    const all = [bar, pricey, graded];
    expect(matchPlaces(found, all, { under21: true, minGrade: null, budget: null })).toHaveLength(
      2,
    );
    expect(matchPlaces(found, all, { under21: false, minGrade: null, budget: 2 })).toHaveLength(2);
    expect(
      matchPlaces(found, all, { under21: false, minGrade: "B", budget: null }).map(
        (m) => m.place.id,
      ),
    ).toEqual(["osm:bar"]);
  });
});
