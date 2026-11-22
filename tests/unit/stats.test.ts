import { describe, expect, it } from "vitest";
import { walkM } from "@/lib/geo/distance";
import type { ShapeLine, Station } from "@/lib/gtfs/types";
import {
  lastTrainMargin,
  live,
  ridesOf,
  stationIndex,
  stationsVisited,
  type RideEvent,
} from "@/lib/rides";
import { squads } from "@/lib/squad";
import {
  caughtLastTrain,
  linesRidden,
  milesOnT,
  metersWalked,
  nightsOut,
  stopsCount,
  type NightStop,
} from "@/lib/stats";

const station = (id: string, lat: number, lon: number, stops: string[]): Station => ({
  id,
  name: id,
  lat,
  lon,
  routes: ["Red"],
  stops,
});
const stations = [
  station("place-a", 42.35, -71.06, ["a1", "a2"]),
  station("place-b", 42.36, -71.06, ["b1"]),
  station("place-c", 42.37, -71.06, ["c1"]),
];
const index = stationIndex(stations);

const base = new Date("2026-11-20T20:00:00-05:00").getTime();
let clock = 0;
const event = (
  kind: RideEvent["event"],
  stopId: string | null,
  options: { routeId?: string; tripId?: string; isReplay?: boolean } = {},
): RideEvent => ({
  ts: new Date(base + 60_000 * clock++),
  event: kind,
  stopId,
  routeId: options.routeId ?? "Red",
  tripId: options.tripId ?? "t1",
  isReplay: options.isReplay ?? false,
});

describe("rides", () => {
  it("[F8.3] turns events into rides from each board to the trip's last stop", () => {
    const events = [
      event("board", "a1"),
      event("pass", "b1"),
      event("pass", "a2", { tripId: "other" }),
      event("alight", "c1"),
      event("board", "c1", { tripId: "t2" }),
      event("pass", "unknown", { tripId: "t2" }),
      event("pass", "place-b", { tripId: "t2" }),
      event("board", "a1", { tripId: "t3", isReplay: true }),
      event("alight", "b1", { tripId: "t3", isReplay: true }),
    ];
    expect(ridesOf(events.reverse(), index)).toEqual([
      { routeId: "Red", from: "place-a", to: "place-c" },
      { routeId: "Red", from: "place-c", to: "place-b" },
      { routeId: "Red", from: "place-a", to: "place-b" },
    ]);
    expect(ridesOf(live(events), index)).toHaveLength(2);
  });

  it("[F8.3] ends a ride at its alight and ignores other trips' events", () => {
    const otherTripLast = [
      event("board", "a1"),
      event("pass", "b1"),
      event("pass", "c1", { tripId: "t9" }),
    ];
    expect(ridesOf(otherTripLast, index)).toEqual([
      { routeId: "Red", from: "place-a", to: "place-b" },
    ]);
    const afterAlight = [event("board", "a1"), event("alight", "b1"), event("pass", "c1")];
    expect(ridesOf(afterAlight, index)).toEqual([
      { routeId: "Red", from: "place-a", to: "place-b" },
    ]);
  });

  it("[F8.3] counts stations from live rides and the station nearest each valid check-in", () => {
    const visited = stationsVisited(
      stations,
      [event("board", "a1"), event("alight", "b1", { isReplay: true }), event("on_train", null)],
      [
        { lat: 42.3702, lon: -71.0601, valid: true },
        { lat: 42.3601, lon: -71.0601, valid: false },
      ],
    );
    expect([...visited].sort()).toEqual(["place-a", "place-c"]);
  });
});

describe("stats", () => {
  const metersPerMile = 1609.344;
  const shapes: ShapeLine[] = [
    {
      pattern: "Red-1",
      route: "Red",
      direction: 0,
      points: [],
      stops: [
        { station: "place-a", meters: 0 },
        { station: "place-b", meters: 1.04 * metersPerMile },
        { station: "place-c", meters: 2.08 * metersPerMile },
      ],
    },
  ];

  it("[F8.3] sums miles on the T ride by ride, so the total matches the ride summaries", () => {
    const events = [
      event("board", "a1"),
      event("alight", "b1"),
      event("board", "b1", { tripId: "t2" }),
      event("alight", "c1", { tripId: "t2" }),
      event("board", "c1", { tripId: "t3" }),
      event("alight", "a1", { tripId: "t3" }),
    ];
    expect(milesOnT(shapes, index, events)).toBe(2);
  });

  it("[F3.5] [F8.3] gives a replayed ride the same summary as the live ride", () => {
    const ride = [event("board", "a1"), event("pass", "b1"), event("alight", "c1")];
    const replay = ride.map((e) => ({ ...e, isReplay: true }));
    const summary = (events: RideEvent[]) => [
      milesOnT(shapes, index, events),
      stopsCount(events),
      linesRidden(events),
    ];
    expect(summary(replay)).toEqual(summary(ride));
    expect(summary(ride)).toEqual([2.1, 3, ["Red"]]);
    expect(summary(live(replay))).toEqual([0, 0, []]);
  });

  it("[F8.3] counts board, pass and alight events as stops, and live ones for totals", () => {
    const events = [
      event("board", "a1"),
      event("pass", "b1"),
      event("alight", "c1"),
      event("on_train", null),
      event("pass", "b1", { isReplay: true }),
    ];
    expect(stopsCount(events)).toBe(4);
    expect(stopsCount(live(events))).toBe(3);
  });

  it("[F8.3] lists the lines boarded, Green branches as Green, in line order", () => {
    const events = [
      event("board", "a1", { routeId: "Mattapan" }),
      event("board", "a1", { routeId: "Green-B" }),
      event("board", "a1", { routeId: "Green-E" }),
      event("pass", "a1", { routeId: "Orange" }),
      event("board", "a1", { routeId: "Blue", isReplay: true }),
      event("board", "a1", { routeId: "Red" }),
    ];
    expect(linesRidden(events)).toEqual(["Red", "Blue", "Green", "Mattapan"]);
    expect(linesRidden(live(events))).toEqual(["Red", "Green", "Mattapan"]);
  });

  const stop = (
    station: { lat: number; lon: number },
    spot: { lat: number; lon: number },
    checkedIn: boolean,
    walkedFromPrevious = false,
  ): NightStop => ({ station, spot, checkedIn, walkedFromPrevious });
  const [s1, s2, s3] = stations;
  const spot1 = { lat: 42.352, lon: -71.058 };
  const spot2 = { lat: 42.354, lon: -71.057 };
  const spot3 = { lat: 42.371, lon: -71.063 };

  it("[F8.3] walks to and from the station for each stop with a valid check-in", () => {
    expect(metersWalked([stop(s1, spot1, true)])).toBeCloseTo(2 * walkM(s1, spot1), 6);
    expect(metersWalked([stop(s1, spot1, false)])).toBe(0);
  });

  it("[F8.3] counts a walk between checked-in crawl stops instead of the station walks", () => {
    const crawl = [stop(s1, spot1, true), stop(s2, spot2, true, true), stop(s3, spot3, true)];
    expect(metersWalked(crawl)).toBeCloseTo(
      walkM(s1, spot1) + walkM(spot1, spot2) + walkM(spot2, s2) + 2 * walkM(s3, spot3),
      6,
    );
    const skipped = [stop(s1, spot1, true), stop(s2, spot2, false, true)];
    expect(metersWalked(skipped)).toBeCloseTo(2 * walkM(s1, spot1), 6);
    const joinedLate = [stop(s1, spot1, false), stop(s2, spot2, true, true)];
    expect(metersWalked(joinedLate)).toBeCloseTo(2 * walkM(s2, spot2), 6);
  });

  it("[F8.3] counts nights out as ended plans with a valid check-in", () => {
    const checkins = [
      { planId: "p1", valid: true },
      { planId: "p1", valid: true },
      { planId: "p2", valid: false },
      { planId: "p3", valid: true },
      { planId: "p4", valid: true },
    ];
    expect(nightsOut(checkins, new Set(["p1", "p2", "p3"]))).toBe(2);
  });

  const minutes = (m: number) => new Date(base + m * 60_000);
  const onTrain = (
    m: number,
    kind: RideEvent["event"] = "on_train",
    tripId: string | null = null,
  ): RideEvent => ({
    ts: minutes(m),
    event: kind,
    routeId: "Red",
    tripId,
    stopId: null,
    isReplay: false,
  });
  const lastTrain = { departs: minutes(10), tripId: "last" };

  it("[F8.3] counts a last train caught when the person got on before it left, or on it late", () => {
    const caught = (events: RideEvent[], checkins = [minutes(0)]) =>
      caughtLastTrain(events, minutes(-60), checkins, lastTrain);
    expect(caught([onTrain(9)])).toBe(true);
    expect(caught([onTrain(9, "board", "earlier")])).toBe(true);
    expect(caught([onTrain(20)])).toBe(true);
    expect(caught([onTrain(20, "board", "last")])).toBe(true);
    expect(caught([onTrain(15, "board", "next")])).toBe(false);
    expect(caught([onTrain(21)])).toBe(false);
    expect(caught([onTrain(-5), onTrain(21)])).toBe(false);
    expect(caught([onTrain(9, "pass")])).toBe(false);
    expect(caught([{ ...onTrain(9), isReplay: true }])).toBe(false);
    expect(caught([])).toBe(false);
    expect(caught([onTrain(9)], [])).toBe(false);
  });

  it("[F8.3] starts the ride home at the first tap after the last check-in and the last stop", () => {
    expect(lastTrainMargin([onTrain(5), onTrain(20, "board", "next")], minutes(0), lastTrain)).toBe(
      5 * 60_000,
    );
    const crawlRide = [onTrain(-30, "board", "to-stop-2"), onTrain(20, "board", "next")];
    expect(caughtLastTrain(crawlRide, minutes(-40), [minutes(-60), minutes(-20)], lastTrain)).toBe(
      false,
    );
    expect(caughtLastTrain(crawlRide, minutes(-20), [minutes(-60)], lastTrain)).toBe(false);
  });
});

describe("squads", () => {
  it("[F12.1] makes squad mates of people with valid check-ins on the same ended plan", () => {
    const mates = squads(
      [
        { profileId: "a", planId: "p1", valid: true },
        { profileId: "b", planId: "p1", valid: true },
        { profileId: "c", planId: "p1", valid: false },
        { profileId: "a", planId: "p2", valid: true },
        { profileId: "d", planId: "p2", valid: true },
        { profileId: "e", planId: "p3", valid: true },
        { profileId: "b", planId: "p4", valid: true },
        { profileId: "f", planId: "p4", valid: true },
      ],
      new Set(["p1", "p3", "p4"]),
    );
    expect(mates).toEqual(
      new Map([
        ["a", new Set(["b"])],
        ["b", new Set(["a", "f"])],
        ["f", new Set(["b"])],
      ]),
    );
  });
});
