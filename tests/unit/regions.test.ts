import { readFileSync } from "node:fs";
import path from "node:path";
import { getResolution, latLngToCell } from "h3-js";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import type { CellState } from "@/lib/geo/cells";
import {
  beyond,
  bostonShare,
  regionIndex,
  regionOf,
  regionSchema,
  regionShares,
  type Region,
} from "@/lib/geo/regions";
import { stationSchema } from "@/lib/gtfs/types";
import { cellsOf, toRegions, type Geometry } from "../../scripts/neighborhoods/regions";

// Squares about 1 km across near Park Street, in GeoJSON [lon, lat] order.
const square = (west: number, south: number, size = 0.012): [number, number][] => [
  [west, south],
  [west + size, south],
  [west + size, south + size],
  [west, south + size],
  [west, south],
];
const polygon = (...rings: [number, number][][]): Geometry => ({
  type: "Polygon",
  coordinates: rings,
});

describe("cellsOf", () => {
  it("[F2.4] fills a polygon with resolution-9 cells whose centers are inside", () => {
    const cells = cellsOf(polygon(square(-71.07, 42.35)));
    expect(cells.length).toBeGreaterThan(5);
    expect(cells.every((cell) => getResolution(cell) === 9)).toBe(true);
    expect(cells).toContain(latLngToCell(42.356, -71.064, 9));
  });

  it("[F2.4] leaves out a hole and adds every part of a multipolygon", () => {
    const outer = square(-71.07, 42.35, 0.03);
    const hole = square(-71.06, 42.36, 0.01);
    const withHole = cellsOf(polygon(outer, hole));
    expect(withHole).not.toContain(latLngToCell(42.365, -71.055, 9));
    expect(withHole.length).toBeLessThan(cellsOf(polygon(outer)).length);
    const two = cellsOf({
      type: "MultiPolygon",
      coordinates: [[square(-71.07, 42.35)], [square(-71.1, 42.37)]],
    });
    expect(two.length).toBe(
      cellsOf(polygon(square(-71.07, 42.35))).length +
        cellsOf(polygon(square(-71.1, 42.37))).length,
    );
  });
});

describe("toRegions", () => {
  it("[F2.4] gives every cell to the first region listed that contains it, sorted", () => {
    const regions = toRegions([
      {
        id: "back-bay",
        name: "Back Bay",
        city: "Boston",
        geometry: polygon(square(-71.08, 42.345)),
      },
      {
        id: "cambridge",
        name: "Cambridge",
        city: "Cambridge",
        geometry: polygon(square(-71.074, 42.345)),
      },
    ]);
    const [first, second] = regions;
    const shared = cellsOf(polygon(square(-71.074, 42.345))).filter((cell) =>
      first.cells.includes(cell),
    );
    expect(shared.length).toBeGreaterThan(0);
    expect(second.cells.some((cell) => shared.includes(cell))).toBe(false);
    expect(first.cells).toEqual([...first.cells].sort());
  });
});

describe("region helpers", () => {
  const regions: Region[] = [
    { id: "back-bay", name: "Back Bay", city: "Boston", cells: ["a", "b", "c", "d"] },
    { id: "fenway", name: "Fenway", city: "Boston", cells: ["e", "f"] },
    { id: "cambridge", name: "Cambridge", city: "Cambridge", cells: ["g", "h"] },
  ];
  // Shares differ by region so that averaging shares, or counting other cities or Beyond, would
  // give a different number than the union of Boston's cells.
  const states = new Map<string, CellState>([
    ["a", "seen"],
    ["b", "visited"],
    ["e", "seen"],
    ["f", "visited"],
    ["g", "visited"],
    ["h", "seen"],
    ["z", "visited"],
  ]);

  it("[F2.4] gives each region's uncovered share", () => {
    expect(regionShares(regions, states)).toEqual([
      { id: "back-bay", name: "Back Bay", share: 0.5 },
      { id: "fenway", name: "Fenway", share: 1 },
      { id: "cambridge", name: "Cambridge", share: 1 },
    ]);
  });

  it("[F2.4] counts Boston as the union of its neighborhoods, leaving other cities out", () => {
    expect(bostonShare(regions, states)).toBe(4 / 6);
  });

  it("[F2.4] puts cells in no region in Beyond, which has no share", () => {
    const index = regionIndex(regions);
    expect(regionOf(index, "a")).toBe("back-bay");
    expect(regionOf(index, "z")).toBe(beyond);
    expect(regionShares(regions, states).some((r) => r.id === beyond)).toBe(false);
  });
});

describe("committed neighborhoods-h3.json", () => {
  const read = (name: string): unknown =>
    JSON.parse(readFileSync(path.join(import.meta.dirname, "../../data", name), "utf8"));
  const regions = z.array(regionSchema).parse(read("neighborhoods-h3.json"));

  it("[F2.4] has Boston's 26 neighborhoods and 3 cities, each cell in one region", () => {
    // IDs are stored as First Light's scope, so a renamed neighborhood must keep its ID (D-058).
    expect(regions.map((r) => r.id).sort()).toEqual([
      "allston",
      "back-bay",
      "bay-village",
      "beacon-hill",
      "brighton",
      "brookline",
      "cambridge",
      "charlestown",
      "chinatown",
      "dorchester",
      "downtown",
      "east-boston",
      "fenway",
      "harbor-islands",
      "hyde-park",
      "jamaica-plain",
      "leather-district",
      "longwood",
      "mattapan",
      "mission-hill",
      "north-end",
      "roslindale",
      "roxbury",
      "somerville",
      "south-boston",
      "south-boston-waterfront",
      "south-end",
      "west-end",
      "west-roxbury",
    ]);
    expect(regions.filter((r) => r.city === "Boston")).toHaveLength(26);
    expect(regions.filter((r) => r.city !== "Boston").map((r) => r.name)).toEqual([
      "Cambridge",
      "Somerville",
      "Brookline",
    ]);
    const cells = regions.flatMap((r) => r.cells);
    expect(new Set(cells).size).toBe(cells.length);
    expect(cells.every((cell) => getResolution(cell) === 9)).toBe(true);
  });

  it("[F2.4] puts known stations in the right region", () => {
    const stations = z.array(stationSchema).parse(read("stations.json"));
    const index = regionIndex(regions);
    const regionAt = (id: string) => {
      const station = stations.find((s) => s.id === id);
      if (!station) throw new Error(`No station ${id}`);
      return regionOf(index, latLngToCell(station.lat, station.lon, 9));
    };
    expect(regionAt("place-harsq")).toBe("cambridge");
    expect(regionAt("place-davis")).toBe("somerville");
    expect(regionAt("place-cool")).toBe("brookline");
    expect(regionAt("place-kencl")).toBe("fenway");
    expect(regionAt("place-pktrm")).toBe("downtown");
    expect(regionAt("place-qnctr")).toBe(beyond);
  });
});
