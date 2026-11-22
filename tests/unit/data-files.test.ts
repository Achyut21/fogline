import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { graphSchema, shapeLineSchema, stationSchema, timetableSchema } from "@/lib/gtfs/types";
import { gradedCategories, placeSchema } from "@/lib/places/types";

const dataDir = path.join(import.meta.dirname, "../../data");
const read = (file: string): unknown => JSON.parse(readFileSync(path.join(dataDir, file), "utf8"));

describe("committed data files", () => {
  it("match their schemas and share one station list and feed version", () => {
    const stations = z.array(stationSchema).parse(read("stations.json"));
    const graph = graphSchema.parse(read("graph.json"));
    const timetable = timetableSchema.parse(read("timetable.json"));
    const shapes = z.array(shapeLineSchema).parse(read("shapes.json"));

    const ids = stations.map((s) => s.id);
    expect(graph.stations).toEqual(ids);
    expect(timetable.stations).toEqual(ids);
    expect(timetable.feedVersion).toBe(graph.feedVersion);
    expect(shapes.every((line) => line.stops.every((stop) => ids.includes(stop.station)))).toBe(
      true,
    );

    const inRange = (i: number | null, length: number) => i === null || i < length;
    for (const legs of Object.values(graph.legs)) {
      for (const leg of legs) {
        expect(inRange(leg.from, ids.length) && inRange(leg.to, ids.length)).toBe(true);
        expect(leg.routes.every((r) => inRange(r, graph.routeSets.length))).toBe(true);
      }
    }
    expect(graph.walks.every((w) => inRange(w.from, ids.length) && inRange(w.to, ids.length))).toBe(
      true,
    );
    expect(graph.transferSeconds).toHaveLength(ids.length);
    expect(timetable.patterns.flat().every((i) => inRange(i, ids.length))).toBe(true);
    expect(timetable.transferSeconds).toEqual(graph.transferSeconds);
    expect(timetable.walks).toEqual(graph.walks);
    for (const trip of timetable.trips) {
      expect(inRange(trip.pattern, timetable.patterns.length)).toBe(true);
      expect(inRange(trip.service, timetable.services.length)).toBe(true);
      expect(trip.offsets).toHaveLength(timetable.patterns[trip.pattern].length);
    }
    expect(
      Object.values(timetable.dates)
        .flat()
        .every((i) => inRange(i, timetable.services.length)),
    ).toBe(true);
  });

  it("[F4.5] [F11.4] has places near real stations, graded only where the city inspects", () => {
    const ids = new Set(
      z
        .array(stationSchema)
        .parse(read("stations.json"))
        .map((s) => s.id),
    );
    const places = z.array(placeSchema).parse(read("places.json"));
    expect(places.length).toBeGreaterThan(1000);
    expect(new Set(places.map((p) => p.id)).size).toBe(places.length);
    for (const place of places) {
      expect(place.stations.length).toBeGreaterThan(0);
      expect(place.stations.every((s) => ids.has(s.id) && s.walkM <= 600)).toBe(true);
      expect(place.stations.map((s) => s.walkM)).toEqual(
        [...place.stations.map((s) => s.walkM)].sort((a, b) => a - b),
      );
    }
    const graded = places.filter((p) => p.grade !== null);
    expect(graded.length).toBeGreaterThan(0);
    expect(graded.every((p) => [...gradedCategories, "bar", "club"].includes(p.category))).toBe(
      true,
    );
  });
});
