import { getResolution } from "h3-js";
import { describe, expect, it } from "vitest";
import { applyReveal, cellOf, revealAround, uncoveredShare, type CellState } from "@/lib/geo/cells";
import { haversineM, walkM, walkMinutes } from "@/lib/geo/distance";

const parkStreet = { lat: 42.35639, lon: -71.0624 };
const metersPerDegreeLat = 111_195.08;

describe("distance", () => {
  it("measures one degree of latitude as about 111.2 km, the same both ways", () => {
    const a = { lat: 42, lon: -71 };
    const b = { lat: 43, lon: -71 };
    expect(haversineM(a, b)).toBeCloseTo(metersPerDegreeLat, 0);
    expect(haversineM(b, a)).toBe(haversineM(a, b));
    expect(haversineM(a, a)).toBe(0);
  });

  it("shrinks east-west distances with latitude", () => {
    expect(haversineM({ lat: 42, lon: -71 }, { lat: 42, lon: -70 })).toBeCloseTo(82_633.6, 0);
    expect(haversineM(parkStreet, { lat: 42.3736, lon: -71.119 })).toBeCloseTo(5_028.5, 0);
  });

  it("[F4.5] stretches the straight line by 1.25 for walking, so 480 m straight is 600 m on foot", () => {
    const north = { lat: parkStreet.lat + 480 / metersPerDegreeLat, lon: parkStreet.lon };
    expect(walkM(parkStreet, north)).toBeCloseTo(600, 0);
    const metersPerDegreeLon = metersPerDegreeLat * Math.cos((parkStreet.lat * Math.PI) / 180);
    const east = { lat: parkStreet.lat, lon: parkStreet.lon + 480 / metersPerDegreeLon };
    expect(walkM(parkStreet, east)).toBeCloseTo(600, 0);
  });

  it("[F5.2] walks 80 m a minute", () => {
    expect(walkMinutes(800)).toBe(10);
    expect(walkMinutes(600)).toBe(7.5);
  });
});

describe("fog cells", () => {
  it("[F2.1] reveals the home station's cell and its ring as seen, at resolution 9", () => {
    const reveal = revealAround("home", parkStreet);
    expect(reveal.state).toBe("seen");
    expect(reveal.cells).toHaveLength(7);
    expect(reveal.cells).toContain(cellOf(parkStreet));
    expect(reveal.cells.every((cell) => getResolution(cell) === 9)).toBe(true);
  });

  it("[F3.3] reveals one ring around a station the ride passes as seen", () => {
    expect(revealAround("ride", parkStreet)).toEqual({
      cells: revealAround("home", parkStreet).cells,
      state: "seen",
    });
  });

  it("[F6.3] reveals two rings around a checked-in spot as visited", () => {
    const reveal = revealAround("checkin", parkStreet);
    expect(reveal.state).toBe("visited");
    expect(reveal.cells).toHaveLength(19);
  });

  it("[F7.3] reveals one ring around the puzzle venue as seen", () => {
    const reveal = revealAround("puzzle", parkStreet);
    expect(reveal.state).toBe("seen");
    expect(reveal.cells).toHaveLength(7);
  });

  it("[F6.3] lets visited win over seen and lists only cells that left the fog", () => {
    const [a, b, c] = revealAround("home", parkStreet).cells;
    const current = new Map<string, CellState>([
      [a, "visited"],
      [b, "seen"],
    ]);

    const seenAgain = applyReveal(current, { cells: [a, b, c], state: "seen" });
    expect(seenAgain.next.get(a)).toBe("visited");
    expect(seenAgain.next.get(b)).toBe("seen");
    expect(seenAgain.next.get(c)).toBe("seen");
    expect(seenAgain.uncovered).toEqual([c]);

    const visited = applyReveal(current, { cells: [b], state: "visited" });
    expect(visited.next.get(b)).toBe("visited");
    expect(visited.uncovered).toEqual([]);
    expect(current.get(b)).toBe("seen");
  });

  it("[F2.4] counts a region's seen and visited cells over all its cells", () => {
    const region = revealAround("home", parkStreet).cells.slice(0, 4);
    const outside = revealAround("checkin", { lat: 42.3736, lon: -71.119 }).cells[0];
    const states = new Map<string, CellState>([
      [region[0], "seen"],
      [region[1], "visited"],
      [region[2], "seen"],
      [outside, "visited"],
    ]);
    expect(uncoveredShare(states, region)).toBe(0.75);
    expect(uncoveredShare(new Map(), region)).toBe(0);
    expect(() => uncoveredShare(states, [])).toThrow("A region needs at least one cell");
  });
});
