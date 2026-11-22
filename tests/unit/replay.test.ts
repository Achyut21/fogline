import { describe, expect, it } from "vitest";
import { type ShapeLine } from "@/lib/gtfs/types";
import { data } from "@/server/data";
import { rideStops, shapeFor, stationTimes, type Sample } from "@/lib/replay";
import { pointAt } from "../support/recorded-trip";

const shapes = data.shapes();
const greenD = shapes.find((s) => s.route === "Green-D" && s.direction === 0);
const t0 = new Date("2026-11-24T19:00:00-05:00").getTime();
const minute = 60_000;

/** A recorded position this many meters along the shape, `minutes` after t0. */
const sampleAt = (line: ShapeLine, meters: number, minutes: number): Sample => ({
  ts: new Date(t0 + minutes * minute),
  ...pointAt(line, meters),
});

describe("replay", () => {
  if (!greenD) throw new Error("Green-D westbound missing from data/shapes.json");

  it("[F3.5] [F3.3] times every station between two minute samples, the skipped ones included", () => {
    // Kenmore (7580 m) at 0 and 1 min, Longwood (9120 m) at 3, Brookline Hills (11164 m) at 6.
    const samples = [
      sampleAt(greenD, 7580, 0),
      sampleAt(greenD, 7580, 1),
      sampleAt(greenD, 9120, 3),
      sampleAt(greenD, 11164, 6),
    ];
    const times = stationTimes(samples, greenD);
    expect(times.map((t) => t.station)).toEqual([
      "place-kencl",
      "place-fenwy",
      "place-longw",
      "place-bvmnl",
      "place-brkhl",
    ]);
    const minutes = times.map((t) => Math.round(((t.at.getTime() - t0) / minute) * 10) / 10);
    expect(minutes[0]).toBe(1);
    expect(minutes[1]).toBeGreaterThan(1);
    expect(minutes[1]).toBeLessThan(3);
    expect(minutes[2]).toBeCloseTo(3, 0);
    expect(minutes[3]).toBeGreaterThan(3);
    expect(minutes[3]).toBeLessThan(6);
    expect(minutes[4]).toBeCloseTo(6, 0);
  });

  it("[F3.5] never puts a later station before an earlier one when the train backs off", () => {
    const samples = [
      sampleAt(greenD, 7580, 0),
      sampleAt(greenD, 9120, 2),
      sampleAt(greenD, 9000, 3),
      sampleAt(greenD, 10308, 5),
    ];
    const at = stationTimes(samples, greenD).map((t) => t.at.getTime());
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it("[F3.8] boards, passes and alights between the chosen stations", () => {
    const times = stationTimes([sampleAt(greenD, 7580, 0), sampleAt(greenD, 11164, 6)], greenD);
    expect(rideStops(times, "place-fenwy").map((s) => [s.station, s.event])).toEqual([
      ["place-fenwy", "board"],
      ["place-longw", "pass"],
      ["place-bvmnl", "pass"],
      ["place-brkhl", "alight"],
    ]);
    expect(rideStops(times, "place-kencl", "place-longw").map((s) => s.event)).toEqual([
      "board",
      "pass",
      "alight",
    ]);
    expect(rideStops(times, "place-brkhl")).toEqual([]);
    expect(rideStops(times, "place-pktrm")).toEqual([]);
  });

  it("[F3.5] picks the Red Line branch the trip was seen on", () => {
    const end = (seen: string[]) =>
      shapeFor(shapes, "Red", 0, "place-pktrm", seen)?.stops.at(-1)?.station;
    expect(end(["place-jfk", "place-nqncy", "place-qnctr"])).toBe("place-brntn");
    expect(end(["place-jfk", "place-shmnl", "place-fldcr"])).toBe("place-asmnl");
    expect(shapeFor(shapes, "Red", 0, "place-kencl", [])).toBeUndefined();
  });
});
