import { describe, expect, it } from "vitest";
import { rideMiles } from "@/lib/geo/miles";
import { bucketKeys, type Graph, type Leg, type ShapeLine } from "@/lib/gtfs/types";
import type { Place } from "@/lib/places/types";
import { fairOptions, rankStations, spotsNear, type SpotFilters } from "@/lib/solver/fair";
import { travelTimesFrom } from "@/lib/solver/travel";
import { serviceTimeToDate } from "@/lib/time";

// Harvard (H), Tufts (T) and BU (B) friends. Park Street (P) is the hub; X is one stop past it;
// Kenmore (K) sits between BU and Park; Z is far past Tufts; U has no trains at all.
// Each leg below costs wait + ride, and a transfer costs 180 s everywhere.
const stations = ["B", "H", "K", "P", "T", "U", "X", "Z"];
const at = (id: string) => stations.indexOf(id);
const everyBucket = (value: number) => bucketKeys.map(() => value);
const both = (a: string, b: string, ride: number, wait: number): Leg[] =>
  [
    [a, b],
    [b, a],
  ].map(([from, to]) => ({
    from: at(from),
    to: at(to),
    ride: everyBucket(ride),
    wait: everyBucket(wait),
    routes: everyBucket(0),
  }));

const graph: Graph = {
  feedVersion: "test",
  dates: { weekday: "2026-11-17", saturday: "2026-11-28", sunday: "2026-11-22" },
  stations,
  routeSets: [["Red"]],
  transferSeconds: stations.map(() => 180),
  walks: [],
  legs: {
    weekday: [
      ...both("H", "P", 600, 120),
      ...both("T", "P", 1200, 300),
      ...both("B", "K", 300, 120),
      ...both("K", "P", 600, 120),
      ...both("P", "X", 240, 60),
      ...both("T", "Z", 1700, 300),
    ],
    saturday: [],
    sunday: [],
  },
};

const friends = [
  { id: "priya", station: "H" },
  { id: "sam", station: "T" },
  { id: "maya", station: "B" },
];
const tuesday6pm = serviceTimeToDate("2026-11-17", 18 * 3600);

function place(
  id: string,
  category: Place["category"],
  station: string,
  walkM: number,
  extra: Partial<Place> = {},
): Place {
  return {
    id,
    name: id,
    category,
    lat: 42.35,
    lon: -71.06,
    stations: [{ id: station, walkM }],
    ageRule: "all",
    price: 2,
    hours: null,
    grade: null,
    ...extra,
  };
}

const places: Place[] = [
  place("p1-food", "food", "P", 200, { grade: { letter: "A", date: "2026-10-01" } }),
  place("p2-bar", "bar", "P", 100, { ageRule: "21plus" }),
  place("p3-coffee", "coffee", "X", 300, { price: 1, grade: { letter: "B", date: "2026-09-01" } }),
  place("p4-far-food", "food", "K", 650, { grade: { letter: "A", date: "2026-10-01" } }),
  place("p5-food", "food", "K", 500, { price: 3, grade: { letter: "C", date: "2026-08-01" } }),
  place("p6-park", "park", "H", 100, { price: null }),
  place("p7-dessert", "dessert", "B", 590, {
    price: null,
    grade: { letter: "A", date: "2026-10-01" },
  }),
];

const eat: SpotFilters = {
  categories: ["food", "coffee", "dessert"],
  budget: null,
  minGrade: null,
  under21: false,
};

describe("rankStations", () => {
  it("[F4.2] uses each friend's T time from the travel graph for the plan's day and hour", () => {
    const park = rankStations(graph, friends, tuesday6pm).find((r) => r.station === "P");
    expect(park?.times.map((t) => [t.participant, t.travel.seconds])).toEqual([
      ["priya", 720],
      ["sam", 1500],
      ["maya", 1320],
    ]);
    expect(park?.times[2].travel).toEqual(travelTimesFrom(graph, "B", "weekday", 18).get("P"));
  });

  it("[F4.3] ranks by max plus half the spread, breaks ties by the total, and drops trips over 75 minutes", () => {
    const ranked = rankStations(graph, friends, tuesday6pm);
    expect(ranked.map((r) => [r.station, r.score, r.total])).toEqual([
      ["P", 1890, 3540],
      ["X", 2370, 4980],
      ["K", 3390, 4440],
      ["H", 3600, 4620],
      ["B", 4500, 5220],
      ["T", 4500, 5400],
    ]);
  });

  it("[F4.3] ranks a lone participant's nearest stations first", () => {
    expect(rankStations(graph, [friends[0]], tuesday6pm)[0]).toMatchObject({
      station: "H",
      score: 0,
    });
    expect(() => rankStations(graph, [], tuesday6pm)).toThrow(
      "A plan needs at least one participant",
    );
  });
});

describe("spotsNear", () => {
  it("[F4.5] keeps spots within 600 m walking that match category, budget and grade", () => {
    expect(spotsNear(places, "K", eat).map((s) => s.place.id)).toEqual(["p5-food"]);
    expect(spotsNear(places, "K", { ...eat, budget: 2 })).toEqual([]);
    expect(spotsNear(places, "X", { ...eat, minGrade: "B" }).map((s) => s.place.id)).toEqual([
      "p3-coffee",
    ]);
    expect(spotsNear(places, "X", { ...eat, minGrade: "A" })).toEqual([]);
    expect(spotsNear(places, "B", { ...eat, budget: 1 }).map((s) => [s.place.id, s.walkM])).toEqual(
      [["p7-dessert", 590]],
    );
  });

  it("[F4.5] applies the food grade only where people eat", () => {
    const outdoors = { ...eat, categories: ["park" as const], minGrade: "A" as const };
    expect(spotsNear(places, "H", outdoors).map((s) => s.place.id)).toEqual(["p6-park"]);
  });

  it("[F1.5] [F4.9] never offers 21+ spots once anyone joined is under 21", () => {
    const drinks: SpotFilters = { ...eat, categories: ["bar"] };
    expect(spotsNear(places, "P", drinks).map((s) => s.place.id)).toEqual(["p2-bar"]);
    expect(spotsNear(places, "P", { ...drinks, under21: true })).toEqual([]);
  });
});

describe("fairOptions", () => {
  it("[F4.4] offers up to 3 stations, each with everyone's minutes, lines, transfers and spots", () => {
    const result = fairOptions(graph, places, friends, tuesday6pm, eat);
    if (result.kind !== "options") throw new Error(`expected options, got ${result.blockedBy}`);
    expect(result.options.map((o) => o.station)).toEqual(["P", "X", "K"]);
    const park = result.options[0];
    expect(park.spots.map((s) => [s.place.id, s.walkM])).toEqual([["p1-food", 200]]);
    const maya = park.times.find((t) => t.participant === "maya")?.travel;
    expect(maya?.transfers).toEqual(["K"]);
    expect(maya?.steps.map((s) => (s.kind === "ride" ? s.routes : []))).toEqual([["Red"], ["Red"]]);
  });

  it("[F4.6] names the filter to relax when nothing fits", () => {
    const none = (filters: SpotFilters, who = friends) =>
      fairOptions(graph, places, who, tuesday6pm, filters);
    expect(none({ ...eat, categories: ["food"], budget: 1 })).toEqual({
      kind: "none",
      blockedBy: "budget",
    });
    expect(none({ ...eat, categories: ["coffee"], minGrade: "A" })).toEqual({
      kind: "none",
      blockedBy: "minGrade",
    });
    expect(none({ ...eat, categories: ["club"] })).toEqual({
      kind: "none",
      blockedBy: "categories",
    });
    expect(none(eat, [...friends, { id: "leo", station: "U" }])).toEqual({
      kind: "none",
      blockedBy: "time",
    });
    expect(fairOptions(graph, [], friends, tuesday6pm, eat)).toEqual({
      kind: "none",
      blockedBy: "spots",
    });
  });
});

describe("rideMiles", () => {
  const shapes: ShapeLine[] = [
    {
      pattern: "Red-1-0",
      route: "Red",
      direction: 0,
      points: [],
      stops: [
        { station: "H", meters: 0 },
        { station: "P", meters: 5363 },
        { station: "D", meters: 5600 },
      ],
    },
    {
      pattern: "Red-1-1",
      route: "Red",
      direction: 1,
      points: [],
      stops: [
        { station: "D", meters: 0 },
        { station: "P", meters: 237 },
        { station: "H", meters: 5600 },
      ],
    },
  ];

  it("[F3.4] measures along the route's shape in the direction ridden, to 0.1 mi", () => {
    expect(rideMiles(shapes, "Red", "H", "P")).toBe(3.3);
    expect(rideMiles(shapes, "Red", "P", "H")).toBe(3.3);
    expect(rideMiles(shapes, "Red", "P", "D")).toBe(0.1);
    expect(rideMiles(shapes, "Orange", "H", "P")).toBeNull();
    expect(rideMiles(shapes, "Red", "H", "Q")).toBeNull();
  });
});
