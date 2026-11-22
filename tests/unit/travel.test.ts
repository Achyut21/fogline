import { describe, expect, it } from "vitest";
import { bucketKeys, type Graph, type Leg } from "@/lib/gtfs/types";
import { travelTime } from "@/lib/solver/travel";

// Stations A, B, C and D in a row. B and C are a short walk apart, with no train between them.
const everyBucket = (value: number) => bucketKeys.map(() => value);
const leg = (from: number, to: number, ride: number, wait: number): Leg => ({
  from,
  to,
  ride: everyBucket(ride),
  wait: everyBucket(wait),
  routes: everyBucket(0),
});

const graph: Graph = {
  feedVersion: "test",
  dates: { weekday: "2026-11-17", saturday: "2026-11-28", sunday: "2026-11-22" },
  stations: ["A", "B", "C", "D"],
  routeSets: [["Red"]],
  transferSeconds: [180, 180, 180, 180],
  walks: [{ from: 1, to: 2, seconds: 240 }],
  legs: { weekday: [leg(0, 1, 600, 120), leg(2, 3, 300, 60)], saturday: [], sunday: [] },
};

describe("travelTime transfers", () => {
  it("[F4.4] counts one transfer for a ride, a walk to another station and a ride", () => {
    const trip = travelTime(graph, "A", "D", "weekday", 18);
    expect(trip?.steps.map((s) => [s.kind, s.from, s.to])).toEqual([
      ["ride", "A", "B"],
      ["walk", "B", "C"],
      ["ride", "C", "D"],
    ]);
    expect(trip?.transfers).toEqual(["B"]);
    expect(trip?.seconds).toBe(120 + 600 + 240 + 60 + 300);
  });

  it("[F4.4] counts no transfer when the trip only starts with a walk", () => {
    expect(travelTime(graph, "B", "D", "weekday", 18)?.transfers).toEqual([]);
  });

  it("finds nothing on a day type with no rides", () => {
    expect(travelTime(graph, "A", "D", "sunday", 18)).toBeNull();
  });
});
