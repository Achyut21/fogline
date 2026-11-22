import { describe, expect, it } from "vitest";
import type { Timetable, TimetableTrip } from "@/lib/gtfs/types";
import { leaveByFor, marginSeconds } from "@/lib/lasttrain/leave-by";
import { lastTrain } from "@/lib/lasttrain/search";
import { parseGtfsTime as t, serviceTimeToDate } from "@/lib/time";

// Stations in a row: A, B, C, D, E, then G past E. F is a short walk from C and has its own
// train to D. Service 0 runs on weekdays, service 1 on Thanksgiving.
const stations = ["A", "B", "C", "D", "E", "F", "G"];
const [A, B, C, D, E, F, G] = stations.map((_, i) => i);

function trip(
  id: string,
  pattern: number,
  times: string[],
  extra: Partial<TimetableTrip> = {},
): TimetableTrip {
  const start = t(times[0]);
  return {
    id,
    route: "Red",
    direction: 0,
    service: 0,
    pattern,
    start,
    offsets: times.map((time) => t(time) - start),
    ...extra,
  };
}

function timetable(trips: TimetableTrip[]): Timetable {
  return {
    feedVersion: "test",
    stations,
    services: ["WKD", "SUN"],
    dates: { "2026-11-20": [0], "2026-11-26": [1] },
    patterns: [
      [A, B, C],
      [C, D],
      [D, E],
      [F, D],
      [E, G],
    ],
    transferSeconds: [180, 180, 240, 180, 180, 180, 180],
    walks: [
      { from: C, to: F, seconds: 300 },
      { from: F, to: C, seconds: 300 },
    ],
    trips,
  };
}

describe("lastTrain", () => {
  it("[F5.1] finds the latest departure that reaches home, past 24:00:00", () => {
    const tt = timetable([
      trip("abc-1", 0, ["23:00:00", "23:10:00", "23:20:00"]),
      trip("abc-2", 0, ["25:10:00", "25:20:00", "25:30:00"]),
    ]);
    expect(lastTrain(tt, "A", "C", "2026-11-20")).toEqual({
      kind: "train",
      departs: t("25:10:00"),
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
      trip("abc-1", 0, ["24:00:00", "24:10:00", "24:20:00"]),
      trip("abc-2", 0, ["24:10:00", "24:20:00", "24:30:00"]),
      trip("cd-1", 1, ["24:33:00", "24:40:00"]),
    ]);
    const result = lastTrain(tt, "A", "D", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("24:00:00"), transfers: ["C"] });
  });

  it("[F5.1] changes trains at most twice", () => {
    const tt = timetable([
      trip("abc", 0, ["23:00:00", "23:10:00", "23:20:00"]),
      trip("cd", 1, ["23:30:00", "23:40:00"]),
      trip("de", 2, ["23:50:00", "24:00:00"]),
      trip("eg", 4, ["24:10:00", "24:20:00"]),
    ]);
    expect(lastTrain(tt, "A", "E", "2026-11-20")).toMatchObject({
      kind: "train",
      transfers: ["C", "D"],
    });
    expect(lastTrain(tt, "A", "G", "2026-11-20")).toEqual({ kind: "none" });
    expect(lastTrain(tt, "B", "G", "2026-11-20")).toEqual({ kind: "none" });
    expect(lastTrain(tt, "C", "G", "2026-11-20")).toMatchObject({
      kind: "train",
      departs: t("23:30:00"),
    });
  });

  it("[F5.1] walks between stations when that's the way home", () => {
    const tt = timetable([
      trip("abc", 0, ["23:00:00", "23:10:00", "23:20:00"]),
      trip("fd", 3, ["23:30:00", "23:40:00"]),
    ]);
    const result = lastTrain(tt, "A", "D", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("23:00:00"), transfers: ["C"] });
    expect(result.kind === "train" && result.legs.map((leg) => leg.kind)).toEqual([
      "ride",
      "walk",
      "ride",
    ]);
  });

  it("[F5.1] ignores stops where riders can't board or get off", () => {
    const tt = timetable([
      trip("abc-early", 0, ["23:00:00", "23:10:00", "23:20:00"]),
      trip("abc-no-alight", 0, ["24:00:00", "24:10:00", "24:20:00"], { noAlight: [2] }),
      trip("abc-no-board", 0, ["24:30:00", "24:40:00", "24:50:00"], { noBoard: [0] }),
    ]);
    const result = lastTrain(tt, "A", "C", "2026-11-20");
    expect(result).toMatchObject({ kind: "train", departs: t("24:00:00"), transfers: ["B"] });
    expect(
      result.kind === "train" && result.legs.map((leg) => leg.kind === "ride" && leg.trip),
    ).toEqual(["abc-no-alight", "abc-no-board"]);
    expect(lastTrain(tt, "B", "C", "2026-11-20")).toMatchObject({ departs: t("24:40:00") });
  });

  it("[F5.1] uses the trips of the plan's own service date, holidays included", () => {
    const tt = timetable([
      trip("weekday", 0, ["24:30:00", "24:40:00", "24:50:00"]),
      trip("holiday", 0, ["23:30:00", "23:40:00", "23:50:00"], { service: 1 }),
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
});

describe("leaveByFor", () => {
  const tt = timetable([trip("abc", 0, ["24:22:00", "24:30:00", "24:40:00"])]);
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
