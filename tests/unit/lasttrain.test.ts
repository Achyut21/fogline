import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { timetableSchema, type Timetable, type TimetableTrip } from "@/lib/gtfs/types";
import { leaveByFor, marginSeconds } from "@/lib/lasttrain/leave-by";
import { lastTrain, type LastTrain } from "@/lib/lasttrain/search";
import { parseGtfsTime as t, serviceTimeToDate } from "@/lib/time";

// Stations in a row: A, B, C, D, E, then G past E. F is a 300 s walk from C and has its own
// train to D. C's transfer time is 240 s. Service 0 runs on weekdays, service 1 on Thanksgiving.
const stations = ["A", "B", "C", "D", "E", "F", "G"];
const [A, B, C, D, E, F, G] = stations.map((_, i) => i);
const patterns = [
  [A, B, C],
  [C, D],
  [D, E],
  [F, D],
  [E, G],
  [C, E],
  [E, D],
  [A, F],
];
const pattern = (...route: number[]) => patterns.findIndex((p) => p.join() === route.join());

function trip(
  id: string,
  route: number[],
  times: string[],
  extra: Partial<TimetableTrip> = {},
): TimetableTrip {
  const start = t(times[0]);
  return {
    id,
    route: "Red",
    direction: 0,
    service: 0,
    pattern: pattern(...route),
    start,
    offsets: times.map((time) => t(time) - start),
    ...extra,
  };
}

function timetable(trips: TimetableTrip[], dates: Record<string, number[]> = {}): Timetable {
  return {
    feedVersion: "test",
    stations,
    services: ["WKD", "SUN"],
    dates: { "2026-11-20": [0], "2026-11-26": [1], ...dates },
    patterns,
    transferSeconds: [180, 180, 240, 180, 180, 180, 180],
    walks: [
      { from: C, to: F, seconds: 300 },
      { from: F, to: C, seconds: 300 },
    ],
    trips,
  };
}

/** Every leg must be possible: rides on their trips, transfers and walks with enough time. */
function expectFeasible(tt: Timetable, from: string, home: string, result: LastTrain) {
  if (result.kind !== "train") throw new Error(`expected a train, got ${result.kind}`);
  let at = from;
  let ready = result.departs;
  let rodeIn = false;
  for (const leg of result.legs) {
    expect(leg.from).toBe(at);
    if (leg.kind === "walk") {
      ready += leg.seconds;
      rodeIn = false;
    } else {
      const transfer = rodeIn ? tt.transferSeconds[tt.stations.indexOf(at)] : 0;
      expect(leg.departs).toBeGreaterThanOrEqual(ready + transfer);
      ready = leg.arrives;
      rodeIn = true;
    }
    at = leg.to;
  }
  expect(at).toBe(home);
}

describe("lastTrain", () => {
  it("[F5.1] finds the latest departure that reaches home, past 24:00:00", () => {
    const tt = timetable([
      trip("abc-1", [A, B, C], ["23:00:00", "23:10:00", "23:20:00"]),
      trip("abc-2", [A, B, C], ["25:10:00", "25:20:00", "25:30:00"]),
    ]);
    expect(lastTrain(tt, "A", "C", "2026-11-20")).toEqual({
      kind: "train",
      departs: t("25:10:00"),
      firstTrain: t("25:10:00"),
      transfers: [],
      legs: [
        {
          kind: "ride",
          trip: "abc-2",
          route: "Red",
          from: "A",
          to: "C",
          departs: t("25:10:00"),
          arrives: t("25:30:00"),
        },
      ],
    });
  });

  it("[F5.1] keeps the station's transfer time when changing trains", () => {
    const tt = timetable([
      trip("abc-1", [A, B, C], ["24:00:00", "24:10:00", "24:20:00"]),
      trip("abc-2", [A, B, C], ["24:10:00", "24:20:00", "24:30:00"]),
      trip("cd-1", [C, D], ["24:33:00", "24:40:00"]),
    ]);
    const result = lastTrain(tt, "A", "D", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("24:00:00"), transfers: ["C"] });
    expectFeasible(tt, "A", "D", result);
  });

  it("[F5.1] changes trains at most twice", () => {
    const tt = timetable([
      trip("abc", [A, B, C], ["23:00:00", "23:10:00", "23:20:00"]),
      trip("cd", [C, D], ["23:30:00", "23:40:00"]),
      trip("de", [D, E], ["23:50:00", "24:00:00"]),
      trip("eg", [E, G], ["24:10:00", "24:20:00"]),
    ]);
    const toE = lastTrain(tt, "A", "E", "2026-11-20");
    expect(toE).toMatchObject({ kind: "train", transfers: ["C", "D"] });
    expectFeasible(tt, "A", "E", toE);
    expect(lastTrain(tt, "A", "G", "2026-11-20")).toEqual({ kind: "none" });
    expect(lastTrain(tt, "B", "G", "2026-11-20")).toEqual({ kind: "none" });
    expect(lastTrain(tt, "C", "G", "2026-11-20")).toMatchObject({
      kind: "train",
      departs: t("23:30:00"),
    });
  });

  it("[F5.1] walks between stations without the transfer time", () => {
    const tt = timetable([
      trip("abc", [A, B, C], ["23:03:00", "23:13:00", "23:23:00"]),
      trip("fd", [F, D], ["23:30:00", "23:40:00"]),
    ]);
    const result = lastTrain(tt, "A", "D", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("23:03:00"), transfers: ["C"] });
    expect(result.kind === "train" && result.legs.map((leg) => leg.kind)).toEqual([
      "ride",
      "walk",
      "ride",
    ]);
    expectFeasible(tt, "A", "D", result);
  });

  it("[F5.1] returns a route it actually checked, even when another label was set later", () => {
    const tt = timetable([
      trip("fd", [F, D], ["24:04:00", "24:14:00"]),
      trip("ce", [C, E], ["24:00:00", "24:03:00"]),
      trip("ed", [E, D], ["24:06:00", "24:12:00"]),
      trip("abc", [A, B, C], ["23:38:00", "23:48:00", "23:58:00"]),
    ]);
    const result = lastTrain(tt, "A", "D", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("23:38:00") });
    expect(
      result.kind === "train" &&
        result.legs.map((leg) => (leg.kind === "ride" ? leg.trip : "walk")),
    ).toEqual(["abc", "walk", "fd"]);
    expectFeasible(tt, "A", "D", result);
  });

  it("[F5.1] takes a walk on when a transfer at the same station is too tight", () => {
    const tt = timetable([
      trip("cd", [C, D], ["24:00:00", "24:10:00"]),
      trip("fd", [F, D], ["24:04:00", "24:14:00"]),
      trip("abc", [A, B, C], ["23:37:00", "23:47:00", "23:57:00"]),
    ]);
    const result = lastTrain(tt, "A", "D", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("23:37:00") });
    expectFeasible(tt, "A", "D", result);
  });

  it("[F5.1] walks home from a station a short walk away", () => {
    const tt = timetable([trip("af", [A, F], ["23:00:00", "23:10:00"])]);
    const result = lastTrain(tt, "A", "C", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("23:00:00"), transfers: [] });
    expect(result.kind === "train" && result.legs.map((leg) => leg.kind)).toEqual(["ride", "walk"]);
    expectFeasible(tt, "A", "C", result);
    expect(lastTrain(tt, "F", "C", "2026-11-20")).toEqual({ kind: "no-train-needed" });
  });

  it("[F5.1] starts with a walk when the plan's station is a walk from a later train", () => {
    const tt = timetable([trip("fd", [F, D], ["24:10:00", "24:20:00"])]);
    const result = lastTrain(tt, "C", "D", "2026-11-20");
    expect(result).toMatchObject({
      kind: "train",
      departs: t("24:05:00"),
      firstTrain: t("24:10:00"),
    });
    expectFeasible(tt, "C", "D", result);
  });

  it("[F5.1] ignores stops where riders can't board or get off", () => {
    const tt = timetable([
      trip("abc-early", [A, B, C], ["23:00:00", "23:10:00", "23:20:00"]),
      trip("abc-no-alight", [A, B, C], ["24:00:00", "24:10:00", "24:20:00"], { noAlight: [2] }),
      trip("abc-no-board", [A, B, C], ["24:30:00", "24:40:00", "24:50:00"], { noBoard: [0] }),
    ]);
    const result = lastTrain(tt, "A", "C", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("24:00:00"), transfers: ["B"] });
    expect(
      result.kind === "train" && result.legs.map((leg) => leg.kind === "ride" && leg.trip),
    ).toEqual(["abc-no-alight", "abc-no-board"]);
    expectFeasible(tt, "A", "C", result);
    expect(lastTrain(tt, "B", "C", "2026-11-20")).toMatchObject({ departs: t("24:40:00") });
  });

  it("[F5.1] picks one of two trains that leave at the same second", () => {
    const tt = timetable([
      trip("abc-1", [A, B, C], ["24:00:00", "24:10:00", "24:20:00"]),
      trip("abc-2", [A, B, C], ["24:00:00", "24:12:00", "24:22:00"]),
    ]);
    const result = lastTrain(tt, "A", "C", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("24:00:00") });
    expectFeasible(tt, "A", "C", result);
  });

  it("[F5.1] uses the trips of the plan's own service date, holidays included", () => {
    const tt = timetable([
      trip("weekday", [A, B, C], ["24:30:00", "24:40:00", "24:50:00"]),
      trip("holiday", [A, B, C], ["23:30:00", "23:40:00", "23:50:00"], { service: 1 }),
    ]);
    expect(lastTrain(tt, "A", "C", "2026-11-26")).toMatchObject({ departs: t("23:30:00") });
    expect(lastTrain(tt, "A", "C", "2026-12-25")).toEqual({ kind: "no-timetable" });
  });

  it("needs no train when home is the same station or a walk away, and refuses unknown stations", () => {
    const tt = timetable([]);
    expect(lastTrain(tt, "C", "C", "2026-11-20")).toEqual({ kind: "no-train-needed" });
    expect(lastTrain(tt, "C", "F", "2026-11-20")).toEqual({ kind: "no-train-needed" });
    expect(() => lastTrain(tt, "Z", "C", "2026-11-20")).toThrow("Unknown station: Z or C");
  });

  it("[F5.1] returns only possible routes on the real timetable", () => {
    const real = timetableSchema.parse(
      JSON.parse(readFileSync(path.join(import.meta.dirname, "../../data/timetable.json"), "utf8")),
    );
    const date = Object.keys(real.dates)
      .sort()
      .find((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 1);
    if (!date) throw new Error("the timetable covers no Monday");
    const homes = ["place-dwnxg", "place-asmnl", "place-mdftf", "place-wondl", "place-ogmnl"];
    for (const from of real.stations.filter((_, i) => i % 5 === 0)) {
      for (const home of homes) {
        const result = lastTrain(real, from, home, date);
        if (result.kind === "train") expectFeasible(real, from, home, result);
      }
    }
  });
});

describe("leaveByFor", () => {
  const tt = timetable([trip("abc", [A, B, C], ["24:22:00", "24:30:00", "24:40:00"])]);
  const at = (lat: number) => ({ lat, lon: -71.06 });
  const home = { station: "C", at: at(42.36) };
  const night = (time: string) => serviceTimeToDate("2026-11-20", t(time));

  it("[F5.2] subtracts the walk to the station and a 5-minute buffer", () => {
    const result = leaveByFor(
      tt,
      night("21:00:00"),
      [{ station: "A", at: at(42.35), walkM: 400 }],
      home,
    );
    expect(result).toMatchObject({
      kind: "train",
      departs: night("24:22:00"),
      firstTrain: night("24:22:00"),
      leaveBy: night("24:12:00"),
      startsAfterLeaveBy: false,
    });
  });

  it("[F5.3] warns when the plan starts after someone has to leave", () => {
    const result = leaveByFor(
      tt,
      night("24:15:00"),
      [{ station: "A", at: at(42.35), walkM: 400 }],
      home,
    );
    expect(result).toMatchObject({ kind: "train", startsAfterLeaveBy: true });
  });

  it("[F5.5] uses the last stop of a crawl", () => {
    const result = leaveByFor(
      tt,
      night("21:00:00"),
      [
        { station: "A", at: at(42.35), walkM: 0 },
        { station: "B", at: at(42.355), walkM: 160 },
      ],
      home,
    );
    expect(result).toMatchObject({
      kind: "train",
      departs: night("24:30:00"),
      leaveBy: night("24:23:00"),
    });
  });

  it("[F5.7] gives the walking time home when no train runs", () => {
    const stop = { station: "D", at: at(42.35), walkM: 100 };
    const result = leaveByFor(tt, night("21:00:00"), [stop], home);
    expect(result).toEqual({ kind: "no-train", walkHomeMinutes: 17 });
  });

  it("[F5.1] treats a 1 AM plan as part of the previous night", () => {
    const result = leaveByFor(
      tt,
      new Date("2026-11-21T06:00:00Z"),
      [{ station: "A", at: at(42.35), walkM: 0 }],
      home,
    );
    expect(result).toMatchObject({
      kind: "train",
      departs: night("24:22:00"),
      startsAfterLeaveBy: true,
    });
  });

  it("[F5.2] counts elapsed time on the night the clocks fall back", () => {
    const fallBack = timetable([trip("late", [A, B, C], ["26:30:00", "26:40:00", "26:50:00"])], {
      "2026-10-31": [0],
    });
    const result = leaveByFor(
      fallBack,
      serviceTimeToDate("2026-10-31", t("21:00:00")),
      [{ station: "A", at: at(42.35), walkM: 0 }],
      home,
    );
    expect(result).toMatchObject({
      kind: "train",
      departs: new Date("2026-11-01T06:30:00Z"),
      leaveBy: new Date("2026-11-01T06:25:00Z"),
    });
  });

  it("[F5.1] says when it can't know: home at the plan's station, a date outside the timetable, no stops", () => {
    const stop = { station: "C", at: at(42.36), walkM: 0 };
    expect(leaveByFor(tt, night("21:00:00"), [stop], home)).toEqual({ kind: "no-train-needed" });
    const christmas = serviceTimeToDate("2026-12-25", t("21:00:00"));
    expect(leaveByFor(tt, christmas, [{ ...stop, station: "A" }], home)).toEqual({
      kind: "no-timetable",
    });
    expect(() => leaveByFor(tt, night("21:00:00"), [], home)).toThrow(
      "A plan needs at least one stop",
    );
  });

  it("counts down to the leave-by time", () => {
    expect(marginSeconds(night("24:12:00"), night("24:00:30"))).toBe(690);
    expect(marginSeconds(night("24:12:00"), night("24:13:00"))).toBe(-60);
  });
});
