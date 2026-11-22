import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  explorerAwards,
  firstLightRegions,
  halfUncoveredAt,
  nightAwards,
  type Night,
  type NightBadge,
  type NightCheckin,
} from "@/lib/badges";
import type { Region } from "@/lib/geo/regions";
import type { Station } from "@/lib/gtfs/types";
import type { RideEvent } from "@/lib/rides";

const start = new Date("2026-11-20T20:00:00-05:00");
/** Start time plus minutes and seconds. */
const at = (minutes: number, seconds = 0) =>
  new Date(start.getTime() + (minutes * 60 + seconds) * 1000);

const firstStop = "spot-1";
const checkin = (profileId: string, ts: Date, placeId = firstStop, valid = true): NightCheckin => ({
  profileId,
  placeId,
  ts,
  valid,
});
const ride = (
  profileId: string,
  event: RideEvent["event"],
  ts: Date,
  isReplay = false,
  tripId = "last",
): RideEvent & { profileId: string } => ({
  profileId,
  event,
  ts,
  isReplay,
  routeId: "Red",
  tripId,
  stopId: "place-pktrm",
});
const home = (departs: Date) => ({ departs, tripId: "last" });

const night = (overrides: Partial<Night>): Night => ({
  at: new Date("2026-11-21T12:00:00-05:00"),
  createdBy: null,
  startsAt: start,
  firstPlaceId: firstStop,
  lastStopAt: start,
  participants: [],
  checkins: [],
  rideEvents: [],
  travelSeconds: new Map(),
  lastTrains: new Map(),
  ...overrides,
});
const winners = (n: Night, badge: NightBadge) =>
  nightAwards(n)
    .filter((a) => a.badge === badge)
    .map((a) => a.profileId)
    .sort();

describe("night badges", () => {
  it("[F8.1] First In goes to the earliest check-in at the first stop, shared within 30 s", () => {
    const n = night({
      checkins: [
        checkin("a", at(-5)),
        checkin("b", at(-5, 30)),
        checkin("c", at(-5, 31)),
        checkin("d", at(3)),
      ],
    });
    expect(winners(n, "first-in")).toEqual(["a", "b"]);
  });

  it("[F8.1] First In uses each person's first valid check-in at the first stop only", () => {
    const n = night({
      checkins: [
        checkin("a", at(-20), firstStop, false),
        checkin("a", at(-3)),
        checkin("b", at(-10), "spot-2"),
        checkin("b", at(-1)),
        checkin("b", at(-4)),
      ],
    });
    expect(winners(n, "first-in")).toEqual(["b"]);
  });

  it("[F8.1] Fashionably Late goes to the latest arrival, 10 minutes or more after the start", () => {
    const late = night({ checkins: [checkin("a", at(0)), checkin("b", at(10))] });
    expect(winners(late, "fashionably-late")).toEqual(["b"]);
    const notLate = night({ checkins: [checkin("a", at(0)), checkin("b", at(9, 59))] });
    expect(winners(notLate, "fashionably-late")).toEqual([]);
  });

  it("[F8.1] Fashionably Late is shared within 30 s of the latest, by people 10 minutes late", () => {
    const shared = night({
      checkins: [checkin("a", at(0)), checkin("b", at(12)), checkin("c", at(12, 30))],
    });
    expect(winners(shared, "fashionably-late")).toEqual(["b", "c"]);
    const apart = night({
      checkins: [checkin("a", at(0)), checkin("b", at(11, 59)), checkin("c", at(12, 30))],
    });
    expect(winners(apart, "fashionably-late")).toEqual(["c"]);
    const early = night({
      checkins: [checkin("a", at(-5)), checkin("b", at(9, 40)), checkin("c", at(10))],
    });
    expect(winners(early, "fashionably-late")).toEqual(["c"]);
  });

  it("[F8.1] Fashionably Late skips people who shared First In", () => {
    const n = night({ checkins: [checkin("a", at(15)), checkin("b", at(15, 20))] });
    expect(winners(n, "first-in")).toEqual(["a", "b"]);
    expect(winners(n, "fashionably-late")).toEqual([]);
  });

  it("[F8.1] gives no badge that compares people when only one person is in the comparison", () => {
    const n = night({
      createdBy: "a",
      checkins: [checkin("a", at(15)), checkin("b", at(20), "spot-2")],
      travelSeconds: new Map([
        ["a", 1800],
        ["c", 2400],
      ]),
      lastTrains: new Map([
        ["a", home(at(270))],
        ["b", home(at(270))],
      ]),
      rideEvents: [ride("a", "on_train", at(260))],
    });
    expect(winners(n, "first-in")).toEqual([]);
    expect(winners(n, "fashionably-late")).toEqual([]);
    expect(winners(n, "long-haul")).toEqual([]);
    expect(winners(n, "closest-call")).toEqual([]);
    expect(winners(n, "planner")).toEqual(["a"]);
  });

  it("[F8.1] On the Dot goes to everyone within 2 minutes of the start, either side", () => {
    const n = night({
      checkins: [checkin("a", at(-2)), checkin("b", at(2)), checkin("c", at(2, 1))],
    });
    expect(winners(n, "on-the-dot")).toEqual(["a", "b"]);
    expect(winners(night({ checkins: [checkin("a", at(1))] }), "on-the-dot")).toEqual(["a"]);
    const elsewhere = night({
      checkins: [checkin("a", at(0), "spot-2"), checkin("b", at(-5)), checkin("b", at(0))],
    });
    expect(winners(elsewhere, "on-the-dot")).toEqual([]);
  });

  it("[F8.1] Long Haul goes to the longest trip among people who checked in", () => {
    const n = night({
      checkins: [checkin("a", at(0)), checkin("b", at(1)), checkin("c", at(2), "spot-2")],
      travelSeconds: new Map([
        ["a", 1500],
        ["b", 2400],
        ["c", 2400],
        ["d", 3600],
      ]),
    });
    expect(winners(n, "long-haul")).toEqual(["b", "c"]);
  });

  it("[F8.1] Closest Call goes to the smallest margin among people who caught the last train", () => {
    const people = ["a", "b", "c", "d", "e"];
    const n = night({
      lastStopAt: at(90),
      checkins: [...people.map((id) => checkin(id, at(120), "spot-2")), checkin("e", at(0))],
      lastTrains: new Map(people.map((id) => [id, home(at(270))])),
      rideEvents: [
        ride("a", "on_train", at(265)),
        ride("b", "on_train", at(100)),
        ride("b", "board", at(268)),
        ride("c", "on_train", at(281)),
        ride("d", "on_train", at(269), true),
      ],
    });
    expect(winners(n, "closest-call")).toEqual(["b"]);
  });

  it("[F8.1] Closest Call counts a tap up to 10 minutes after a late last train as 0 to spare", () => {
    const n = night({
      checkins: ["a", "b", "c"].map((id) => checkin(id, at(0))),
      lastTrains: new Map(["a", "b", "c"].map((id) => [id, home(at(270))])),
      rideEvents: [
        ride("a", "on_train", at(268)),
        ride("b", "on_train", at(273)),
        ride("c", "board", at(280)),
      ],
    });
    expect(winners(n, "closest-call")).toEqual(["b", "c"]);
  });

  it("[F8.1] Closest Call waits until every last train has left plus 10 minutes", () => {
    const n = (computedAt: Date) =>
      night({
        at: computedAt,
        checkins: ["a", "b"].map((id) => checkin(id, at(0))),
        lastTrains: new Map([
          ["a", home(at(270))],
          ["b", home(at(280))],
        ]),
        rideEvents: [ride("a", "on_train", at(265)), ride("b", "on_train", at(268))],
      });
    expect(winners(n(at(289)), "closest-call")).toEqual([]);
    expect(winners(n(at(290)), "closest-call")).toEqual(["a"]);
  });

  it("[F8.1] Closest Call ignores rides between crawl stops before the last stop", () => {
    const n = night({
      lastStopAt: at(90),
      checkins: [checkin("a", at(0)), checkin("b", at(0)), checkin("c", at(100), "spot-2")],
      lastTrains: new Map(["a", "b", "c"].map((id) => [id, home(at(270))])),
      rideEvents: [ride("a", "board", at(60)), ride("b", "on_train", at(260))],
    });
    expect(winners(n, "closest-call")).toEqual([]);
  });

  it("[F8.1] Night Owl goes to a valid check-in from 12:00 AM to before 5:00 AM New York time", () => {
    vi.stubEnv("TZ", "UTC");
    onTestFinished(() => {
      vi.unstubAllEnvs();
    });
    const n = night({
      checkins: [
        checkin("a", new Date("2026-11-21T00:10:00-05:00"), "spot-2"),
        checkin("b", new Date("2026-11-20T23:59:00-05:00"), "spot-2"),
        checkin("b", new Date("2026-11-21T00:30:00-05:00"), "spot-2", false),
        checkin("c", new Date("2026-11-21T04:59:59-05:00"), "spot-2"),
        checkin("d", new Date("2026-11-21T05:00:00-05:00"), "spot-2"),
        checkin("e", new Date("2026-11-01T01:30:00-04:00"), "spot-2"),
        checkin("f", new Date("2026-11-01T01:30:00-05:00"), "spot-2"),
        checkin("g", new Date("2026-07-11T00:30:00-04:00"), "spot-2"),
        checkin("h", new Date("2026-07-10T23:30:00-04:00"), "spot-2"),
      ],
    });
    expect(winners(n, "night-owl")).toEqual(["a", "c", "e", "f", "g"]);
  });

  it("[F8.1] Ghost goes to people who said yes and never checked in", () => {
    const n = night({
      participants: [
        { profileId: "a", rsvp: "yes" },
        { profileId: "b", rsvp: "yes" },
        { profileId: "c", rsvp: "yes" },
        { profileId: "d", rsvp: "no" },
        { profileId: "e", rsvp: "pending" },
      ],
      checkins: [checkin("a", at(0)), checkin("b", at(1), firstStop, false)],
    });
    expect(winners(n, "ghost")).toEqual(["b", "c"]);
    const rainedOut = night({ participants: [{ profileId: "a", rsvp: "yes" }] });
    expect(winners(rainedOut, "ghost")).toEqual([]);
  });

  it("[F8.1] Planner goes to the creator when at least 2 people checked in", () => {
    const two = [checkin("b", at(0)), checkin("c", at(1), "spot-2")];
    expect(winners(night({ createdBy: "a", checkins: two }), "planner")).toEqual(["a"]);
    expect(winners(night({ createdBy: "a", checkins: two.slice(0, 1) }), "planner")).toEqual([]);
    expect(winners(night({ createdBy: null, checkins: two }), "planner")).toEqual([]);
  });

  it("[F8.6] gives each person a badge at most once", () => {
    const n = night({
      checkins: [
        checkin("a", at(-1)),
        checkin("a", at(0)),
        checkin("b", at(1)),
        checkin("a", new Date("2026-11-21T00:10:00-05:00"), "spot-2"),
        checkin("a", new Date("2026-11-21T00:40:00-05:00"), "spot-3"),
      ],
    });
    const keys = nightAwards(n).map((a) => `${a.profileId} ${a.badge}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("a night-owl");
  });
});

describe("explorer badges", () => {
  const station = (id: string, routes: string[]): Station => ({
    id,
    name: id,
    lat: 42.35,
    lon: -71.06,
    routes,
    stops: [`${id}-platform`],
  });
  const stations = [
    station("b-only", ["Green-B"]),
    station("c-only", ["Green-C"]),
    station("d-only", ["Green-D"]),
    station("e-only", ["Green-E"]),
    station("trunk", ["Green-B", "Green-C", "Green-D", "Green-E"]),
  ];
  const event = (
    routeId: string,
    kind: RideEvent["event"],
    isReplay = false,
    stopId: string | null = null,
  ): RideEvent => ({ routeId, event: kind, isReplay, ts: start, tripId: "trip", stopId });
  const badges = (events: RideEvent[], stationsVisited = 0, firstLight: string[] = []) =>
    explorerAwards({ events, stations, stationsVisited, firstLight }).map((a) => a.badge);

  it("[F8.2] All Four Lines needs real board events on Red, Orange, Blue and Green", () => {
    const four = ["Red", "Orange", "Blue", "Green-D"].map((r) => event(r, "board"));
    expect(badges(four)).toContain("all-four-lines");
    expect(badges([...four.slice(0, 2), event("Blue", "pass"), four[3]])).not.toContain(
      "all-four-lines",
    );
    expect(badges([...four.slice(0, 2), event("Blue", "board", true), four[3]])).not.toContain(
      "all-four-lines",
    );
  });

  it("[F8.2] Every Green Branch needs board, pass or alight events on B, C, D and E off the trunk", () => {
    const branches = [
      event("Green-B", "board", false, "b-only"),
      event("Green-C", "pass", false, "c-only-platform"),
      event("Green-D", "board", false, "d-only"),
      event("Green-E", "pass", false, "e-only"),
    ];
    expect(badges(branches)).toContain("every-green-branch");
    const withE = (e: RideEvent) => badges([...branches.slice(0, 3), e]);
    expect(withE(event("Green-E", "alight", false, "e-only"))).toContain("every-green-branch");
    expect(withE(event("Green-E", "pass", false, "trunk"))).not.toContain("every-green-branch");
    expect(withE(event("Green-E", "pass", true, "e-only"))).not.toContain("every-green-branch");
  });

  it("[F8.2] 50 Stations needs 50 distinct stations", () => {
    expect(badges([], 50)).toContain("fifty-stations");
    expect(badges([], 49)).not.toContain("fifty-stations");
  });

  it("[F8.2] First Light is scoped to each region", () => {
    expect(
      explorerAwards({
        events: [],
        stations,
        stationsVisited: 0,
        firstLight: ["fenway", "back-bay"],
      }),
    ).toEqual([
      { badge: "first-light", scope: "fenway" },
      { badge: "first-light", scope: "back-bay" },
    ]);
  });

  const regions: Region[] = [
    { id: "four", name: "Four", city: "Boston", cells: ["a", "b", "c", "d"] },
    { id: "five", name: "Five", city: "Boston", cells: ["e", "f", "g", "h", "i"] },
    { id: "tiny", name: "Tiny", city: "Boston", cells: ["j", "k"] },
  ];
  const t = (minute: number) => at(minute);

  it("[F8.2] finds when each region reached 50% uncovered, leaving out regions under 3 cells", () => {
    const reached = halfUncoveredAt(regions, [
      { h3: "a", firstAt: t(30), source: "ride" },
      { h3: "b", firstAt: t(10), source: "ride" },
      { h3: "c", firstAt: t(20), source: "ride" },
      { h3: "e", firstAt: t(5), source: "ride" },
      { h3: "f", firstAt: t(6), source: "ride" },
      { h3: "j", firstAt: t(1), source: "ride" },
      { h3: "k", firstAt: t(2), source: "ride" },
      { h3: "z", firstAt: t(0), source: "ride" },
    ]);
    expect(reached).toEqual(new Map([["four", t(20)]]));
    const fromHome = halfUncoveredAt(regions, [
      { h3: "a", firstAt: t(1), source: "home" },
      { h3: "b", firstAt: t(2), source: "home" },
      { h3: "c", firstAt: t(3), source: "checkin" },
    ]);
    expect(fromHome).toEqual(new Map());
  });

  it("[F8.2] First Light goes to the first squad member to reach 50%, shared within 30 s", () => {
    const own = new Map([
      ["four", t(5)],
      ["five", t(5)],
      ["six", t(5)],
      ["seven", t(5)],
    ]);
    const mates = [
      new Map([
        ["four", t(3)],
        ["seven", at(4, 29)],
      ]),
      new Map([
        ["five", at(4, 30)],
        ["six", t(8)],
      ]),
    ];
    expect(firstLightRegions(own, mates)).toEqual(["five", "six"]);
    expect(firstLightRegions(own, [])).toEqual(["four", "five", "six", "seven"]);
  });
});
