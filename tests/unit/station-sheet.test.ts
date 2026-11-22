import { describe, expect, it } from "vitest";
import { data } from "@/server/data";
import { minutesFromHome, nearbySpots, stopCard } from "@/server/station-sheet";

describe("station sheet data", () => {
  it("[F2.5] [F1.5] lists the nearest spots, without 21+ spots unless the profile is 21+", () => {
    const station = data.places().find((p) => p.ageRule === "21plus" && p.stations[0]?.walkM < 200)
      ?.stations[0].id;
    if (!station) throw new Error("no station with a 21+ spot close by");
    const adult = nearbySpots(station, true);
    const under = nearbySpots(station, false);
    expect(adult).toHaveLength(3);
    expect(adult.map((s) => s.walkM)).toEqual([...adult.map((s) => s.walkM)].sort((a, b) => a - b));
    const adultOnly = new Set(
      data
        .places()
        .filter((p) => p.ageRule === "21plus")
        .map((p) => p.id),
    );
    expect(under.some((s) => adultOnly.has(s.id))).toBe(false);
    expect(under.length).toBeGreaterThan(0);
  });

  it("[F2.5] gives minutes by T from home, zero at home", () => {
    const minutes = minutesFromHome("place-kencl", new Date("2026-11-24T19:00:00-05:00"));
    expect(minutes.get("place-kencl")).toBe(0);
    expect(minutes.get("place-pktrm")).toBeGreaterThan(5);
    expect(minutes.get("place-pktrm")).toBeLessThan(25);
    expect(minutesFromHome("place-kencl", new Date("2026-11-25T04:00:00-05:00")).size).toBe(0);
    expect(minutesFromHome("place-kencl", new Date("2026-11-25T01:30:00-05:00")).size).toBe(0);
  });

  it("[F2.5] gives a station's stop card with its source", () => {
    const card = stopCard("place-alfcl");
    expect(card?.story?.url).toMatch(/^https:\/\/en\.wikipedia\.org\//);
    expect(stopCard("place-nowhere")).toBeNull();
  });
});
