import { describe, expect, it } from "vitest";
import { rideMiles } from "@/lib/geo/miles";
import { trainsRunning } from "@/lib/gtfs/service";
import {
  bucketKeys,
  type Graph,
  type Leg,
  type ShapeLine,
  type Timetable,
  type TimetableTrip,
} from "@/lib/gtfs/types";
import { placeSchema, type Place } from "@/lib/places/types";
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

// Weekday trains from Harvard, Tufts and BU at 5:30 PM and exactly 7 PM: trains run in the hour
// before a 6 PM plan on Tuesday 2026-11-17, but not before 7 PM, 4:30 AM, or on Thanksgiving
// (Sunday service, no trains in this table). Kenmore never has a train to board.
const routes = ["HP", "TP", "BK"];
const departure = (id: string, route: string, start: number): TimetableTrip => ({
  id,
  route: "Red",
  direction: 0,
  service: 0,
  pattern: routes.indexOf(route),
  start,
  offsets: [0, 600],
});
const timetable: Timetable = {
  feedVersion: "test",
  stations,
  transferSeconds: stations.map(() => 180),
  walks: [],
  services: ["WKD", "SUN"],
  dates: { "2026-11-17": [0], "2026-11-26": [1] },
  patterns: [
    [at("H"), at("P")],
    [at("T"), at("P")],
    [at("B"), at("K")],
  ],
  trips: [
    departure("hp-1730", "HP", 17.5 * 3600),
    departure("tp-1730", "TP", 17.5 * 3600),
    departure("bk-1730", "BK", 17.5 * 3600),
    departure("hp-1900", "HP", 19 * 3600),
    departure("tp-1900", "TP", 19 * 3600),
    departure("bk-1900", "BK", 19 * 3600),
  ],
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
    address: null,
    ageRule: category === "bar" || category === "club" ? "21plus" : "all",
    price: 2,
    hours: null,
    grade: null,
    ...extra,
  };
}

const graded = (letter: "A" | "B" | "C", points: number): Place["grade"] => ({
  letter,
  date: "2026-10-01",
  points,
  license: "100000",
  violations: [],
});
const gradeA = graded("A", 0);
const gradeB = graded("B", 20);
const gradeC = graded("C", 40);

const places: Place[] = [
  place("p1-food", "food", "P", 200, { grade: gradeA }),
  place("p2-bar", "bar", "P", 100),
  place("p3-coffee", "coffee", "X", 300, { price: 1, grade: gradeB }),
  place("p4-far-food", "food", "K", 601, { grade: gradeA }),
  place("p5-food", "food", "K", 500, { price: 3, grade: gradeC }),
  place("p6-park", "park", "H", 100, { price: null }),
  place("p7-dessert", "dessert", "B", 600, { price: null, grade: gradeA }),
  place("p8-ungraded-food", "food", "P", 400),
  place("p9-near-food", "food", "P", 50, { grade: gradeB }),
];

const eat: SpotFilters = {
  categories: ["food", "coffee", "dessert"],
  budget: null,
  minGrade: null,
  under21: false,
};

describe("rankStations", () => {
  it("[F4.2] uses each friend's T time from the travel graph", () => {
    const park = rankStations(graph, friends, tuesday6pm).find((r) => r.station === "P");
    expect(park?.times.map((t) => [t.participant, t.travel.seconds])).toEqual([
      ["priya", 720],
      ["sam", 1500],
      ["maya", 1320],
    ]);
    expect(park?.times[2].travel).toEqual(travelTimesFrom(graph, "B", "weekday", 18).get("P"));
  });

  it("[F4.3] ranks by max plus half the spread and drops trips over 75 minutes", () => {
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

  // Two friends at E and W. S(Z1) = 600 + 100 = 700 with a total of 1000; S(A1) = 700 with a
  // total of 1400; Z2 is Z1 again and is listed first. W to N is exactly 75 minutes and W to O
  // one second more.
  const tie: Graph = {
    ...graph,
    stations: ["A1", "E", "N", "O", "W", "Z2", "Z1"],
    transferSeconds: [180, 180, 180, 180, 180, 180, 180],
    legs: {
      weekday: [
        { from: 1, to: 6, ride: everyBucket(300), wait: everyBucket(100), routes: everyBucket(0) },
        { from: 4, to: 6, ride: everyBucket(500), wait: everyBucket(100), routes: everyBucket(0) },
        { from: 1, to: 5, ride: everyBucket(300), wait: everyBucket(100), routes: everyBucket(0) },
        { from: 4, to: 5, ride: everyBucket(500), wait: everyBucket(100), routes: everyBucket(0) },
        { from: 1, to: 0, ride: everyBucket(600), wait: everyBucket(100), routes: everyBucket(0) },
        { from: 4, to: 0, ride: everyBucket(600), wait: everyBucket(100), routes: everyBucket(0) },
        { from: 1, to: 2, ride: everyBucket(60), wait: everyBucket(0), routes: everyBucket(0) },
        { from: 4, to: 2, ride: everyBucket(4500), wait: everyBucket(0), routes: everyBucket(0) },
        { from: 1, to: 3, ride: everyBucket(60), wait: everyBucket(0), routes: everyBucket(0) },
        { from: 4, to: 3, ride: everyBucket(4501), wait: everyBucket(0), routes: everyBucket(0) },
      ],
      saturday: [
        { from: 1, to: 6, ride: everyBucket(900), wait: everyBucket(100), routes: everyBucket(0) },
        { from: 4, to: 6, ride: everyBucket(900), wait: everyBucket(100), routes: everyBucket(0) },
      ],
      sunday: [],
    },
  };
  const pair = [
    { id: "east", station: "E" },
    { id: "west", station: "W" },
  ];

  it("[F4.3] breaks ties by the total, then by station ID, and keeps exactly 75 minutes", () => {
    expect(rankStations(tie, pair, tuesday6pm).map((r) => [r.station, r.score, r.total])).toEqual([
      ["Z1", 700, 1000],
      ["Z2", 700, 1000],
      ["A1", 700, 1400],
      ["N", 6720, 4560],
    ]);
  });

  it("[F4.2] uses the plan's day type, and the previous service date after midnight", () => {
    const saturday = serviceTimeToDate("2026-11-28", 18 * 3600);
    expect(rankStations(tie, pair, saturday).map((r) => [r.station, r.total])).toEqual([
      ["Z1", 2000],
    ]);
    const sundayAt1am = new Date("2026-11-29T06:00:00Z");
    expect(rankStations(tie, pair, sundayAt1am).map((r) => r.station)).toEqual(["Z1"]);
  });

  it("[F4.2] uses the plan's hour bucket", () => {
    const hourly: Graph = {
      ...graph,
      legs: {
        ...graph.legs,
        weekday: graph.legs.weekday.map((leg) => ({
          ...leg,
          wait: bucketKeys.map((bucket) => (bucket === 19 ? 900 : 60)),
        })),
      },
    };
    const at6 = rankStations(hourly, [friends[0]], tuesday6pm).find((r) => r.station === "P");
    const at7 = rankStations(hourly, [friends[0]], serviceTimeToDate("2026-11-17", 19 * 3600));
    expect(at6?.total).toBe(660);
    expect(at7.find((r) => r.station === "P")?.total).toBe(1500);
  });

  it("[F4.3] ranks a lone participant's nearest stations first, and refuses empty or unknown participants", () => {
    expect(rankStations(graph, [friends[0]], tuesday6pm)[0]).toMatchObject({
      station: "H",
      score: 0,
    });
    expect(() => rankStations(graph, [], tuesday6pm)).toThrow(
      "A plan needs at least one participant",
    );
    expect(() => rankStations(graph, [{ id: "leo", station: "" }], tuesday6pm)).toThrow(
      'Unknown station for leo: ""',
    );
  });
});

describe("spotsNear", () => {
  it("[F4.5] keeps spots within 600 m walking, nearest first, that match category and budget", () => {
    expect(spotsNear(places, "P", eat).map((s) => [s.place.id, s.walkM])).toEqual([
      ["p9-near-food", 50],
      ["p1-food", 200],
      ["p8-ungraded-food", 400],
    ]);
    expect(spotsNear(places, "K", eat).map((s) => s.place.id)).toEqual(["p5-food"]);
    expect(spotsNear(places, "K", { ...eat, budget: 2 })).toEqual([]);
    expect(spotsNear(places, "B", { ...eat, budget: 1 }).map((s) => [s.place.id, s.walkM])).toEqual(
      [["p7-dessert", 600]],
    );
  });

  it("[F4.5] orders spots at the same distance by name, then by ID", () => {
    const twins = [
      place("dunkin-b", "coffee", "X", 300),
      place("dunkin-a", "coffee", "X", 300),
    ].map((p) => ({ ...p, name: "Dunkin" }));
    expect(spotsNear(twins, "X", eat).map((s) => s.place.id)).toEqual(["dunkin-a", "dunkin-b"]);
  });

  it("[F11.5] keeps only graded spots that meet the minimum, and unmatched ones only where nobody eats", () => {
    expect(spotsNear(places, "P", { ...eat, minGrade: "B" }).map((s) => s.place.id)).toEqual([
      "p9-near-food",
      "p1-food",
    ]);
    expect(spotsNear(places, "P", { ...eat, minGrade: "A" }).map((s) => s.place.id)).toEqual([
      "p1-food",
    ]);
    const outdoors: SpotFilters = { ...eat, categories: ["park"], minGrade: "A" };
    expect(spotsNear(places, "H", outdoors).map((s) => s.place.id)).toEqual(["p6-park"]);
    const gradedBar = [place("bar-c", "bar", "P", 100, { grade: gradeC })];
    expect(spotsNear(gradedBar, "P", { ...eat, categories: ["bar"], minGrade: "A" })).toEqual([]);
  });

  it("[F1.5] [F4.9] never offers bars, clubs or 21+ spots once anyone joined is under 21", () => {
    const drinks: SpotFilters = { ...eat, categories: ["bar"] };
    expect(spotsNear(places, "P", drinks).map((s) => s.place.id)).toEqual(["p2-bar"]);
    expect(spotsNear(places, "P", { ...drinks, under21: true })).toEqual([]);
    const mislabeled = place("bar-all", "bar", "P", 100, { ageRule: "all" });
    expect(spotsNear([mislabeled], "P", { ...drinks, under21: true })).toEqual([]);
    expect(placeSchema.safeParse(mislabeled).success).toBe(false);
  });
});

describe("fairOptions", () => {
  const options = (filters: SpotFilters, who = friends, list = places, startsAt = tuesday6pm) =>
    fairOptions(graph, timetable, list, who, startsAt, filters);

  it("[F4.4] offers up to 3 stations, each with everyone's minutes, lines, transfers and spots", () => {
    const result = options(eat);
    if (result.kind !== "options") throw new Error(`expected options, got ${result.blockedBy}`);
    expect(result.options.map((o) => o.station)).toEqual(["P", "X", "K"]);
    const maya = result.options[0].times.find((t) => t.participant === "maya")?.travel;
    expect(maya?.transfers).toEqual(["K"]);
    expect(maya?.steps.map((s) => (s.kind === "ride" ? s.routes : []))).toEqual([["Red"], ["Red"]]);
  });

  it("[F4.4] skips well-ranked stations that have no matching spot", () => {
    const result = options({ ...eat, categories: ["dessert"] });
    expect(result.kind === "options" && result.options.map((o) => o.station)).toEqual(["B"]);
  });

  it("[F4.6] names the one filter to relax, budget first, then grade, then category", () => {
    expect(options({ ...eat, categories: ["food"], budget: 1 })).toEqual({
      kind: "none",
      blockedBy: ["budget"],
    });
    expect(options({ ...eat, categories: ["coffee"], minGrade: "A" })).toEqual({
      kind: "none",
      blockedBy: ["minGrade"],
    });
    expect(
      options({ ...eat, categories: ["food"], budget: 1, minGrade: "A" }, friends, [
        place("cheap-b", "food", "P", 100, { price: 1, grade: gradeB }),
        place("pricey-a", "food", "X", 100, { price: 3, grade: gradeA }),
      ]),
    ).toEqual({ kind: "none", blockedBy: ["budget"] });
    expect(options({ ...eat, categories: ["club"] })).toEqual({
      kind: "none",
      blockedBy: ["categories"],
    });
  });

  it("[F4.6] names filters that only work relaxed together, and only ones that were set and needed", () => {
    const pricey = [place("pricey-b", "food", "P", 100, { price: 3, grade: gradeB })];
    expect(
      options({ ...eat, categories: ["food"], budget: 1, minGrade: "A" }, friends, pricey),
    ).toEqual({ kind: "none", blockedBy: ["budget", "minGrade"] });
    const dessertB = [place("dessert-b", "dessert", "P", 100, { price: 1, grade: gradeB })];
    expect(options({ ...eat, categories: ["coffee"], minGrade: "A" }, friends, dessertB)).toEqual({
      kind: "none",
      blockedBy: ["minGrade", "categories"],
    });
    expect(
      options({ ...eat, categories: ["coffee"], budget: 1, minGrade: "A" }, friends, dessertB),
    ).toEqual({ kind: "none", blockedBy: ["minGrade", "categories"] });
    const neither = [
      place("pricey-food-b", "food", "P", 100, { price: 3, grade: gradeB }),
      place("pricey-dessert-a", "dessert", "X", 100, { price: 3, grade: gradeA }),
    ];
    expect(
      options({ ...eat, categories: ["food"], budget: 1, minGrade: "A" }, friends, neither),
    ).toEqual({ kind: "none", blockedBy: ["budget", "minGrade"] });
  });

  it("[F4.6] reports time, no trains or no spots, and never relaxes the age rule", () => {
    expect(options(eat, [...friends, { id: "leo", station: "U" }])).toEqual({
      kind: "none",
      blockedBy: ["time"],
    });
    const noTrains = { kind: "none", blockedBy: ["no-trains"] };
    for (const hours of [3.5, 4.5, 19]) {
      expect(options(eat, friends, places, serviceTimeToDate("2026-11-17", hours * 3600))).toEqual(
        noTrains,
      );
    }
    const thanksgiving = serviceTimeToDate("2026-11-26", 18 * 3600);
    expect(options(eat, friends, places, thanksgiving)).toEqual(noTrains);
    expect(options(eat, friends, [])).toEqual({ kind: "none", blockedBy: ["spots"] });
    const barsOnly = [place("p2-bar", "bar", "P", 100)];
    expect(options({ ...eat, categories: ["bar"], under21: true }, friends, barsOnly)).toEqual({
      kind: "none",
      blockedBy: ["spots"],
    });
  });

  it("[F4.4] checks a date the timetable doesn't cover against its day type's representative date", () => {
    expect(options(eat, friends, places, serviceTimeToDate("2027-01-05", 18 * 3600)).kind).toBe(
      "options",
    );
    expect(options(eat, friends, places, serviceTimeToDate("2027-01-05", 3.5 * 3600))).toEqual({
      kind: "none",
      blockedBy: ["no-trains"],
    });
  });
});

describe("trainsRunning", () => {
  it("[F4.6] needs a train to board at every friend's station in the hour before the start", () => {
    expect(trainsRunning(timetable, "2026-11-17", 18 * 3600, ["H", "T", "B"])).toBe(true);
    expect(trainsRunning(timetable, "2026-11-17", 18 * 3600, ["H", "K"])).toBe(false);
    expect(trainsRunning(timetable, "2026-11-17", 19 * 3600, ["H"])).toBe(false);
    expect(trainsRunning(timetable, "2026-11-17", 19 * 3600 + 1, ["H"])).toBe(true);
    expect(() => trainsRunning(timetable, "2026-12-25", 18 * 3600, ["H"])).toThrow(
      "The timetable doesn't cover 2026-12-25",
    );
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
