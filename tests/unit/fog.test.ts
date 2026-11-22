import { describe, expect, it } from "vitest";
import { applyReveal, cellOf, revealAround, type CellState } from "@/lib/geo/cells";
import { fogDensity, rasterizeFog, revealReach, type Bounds } from "@/three/mask";
import { colorVector } from "@/three/materials/fog-material";
import { fogRenderer } from "@/three/tier";

const buCentral = { lat: 42.350082, lon: -71.106865 };
const bounds: Bounds = { west: -71.13, south: 42.335, east: -71.08, north: 42.365 };
const size = 64;

function pixelAt(mask: Uint8Array, point: { lat: number; lon: number }) {
  const y = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const col = Math.floor(((point.lon - bounds.west) / (bounds.east - bounds.west)) * size);
  const row = Math.floor(
    ((y(bounds.north) - y(point.lat)) / (y(bounds.north) - y(bounds.south))) * size,
  );
  return mask[row * size + col];
}

describe("fog mask", () => {
  it("[F2.2] rasterizes fog, seen and visited cells into three densities", () => {
    const home = applyReveal(new Map(), revealAround("home", buCentral)).next;
    const checkin = { lat: 42.3489, lon: -71.0951 };
    const states = applyReveal(home, revealAround("checkin", checkin)).next;
    const mask = rasterizeFog(states, bounds, size);

    expect(pixelAt(mask, buCentral)).toBe(fogDensity.seen);
    expect(pixelAt(mask, checkin)).toBe(fogDensity.visited);
    expect(pixelAt(mask, { lat: 42.362, lon: -71.128 })).toBe(fogDensity.fog);
    expect(new Set(mask)).toEqual(new Set([fogDensity.fog, fogDensity.seen, fogDensity.visited]));
  });

  it("[F2.2] keeps a visited cell clear when a later reveal marks it seen", () => {
    const states = new Map<string, CellState>([[cellOf(buCentral), "visited"]]);
    const after = applyReveal(states, revealAround("ride", buCentral)).next;
    expect(pixelAt(rasterizeFog(after, bounds, size), buCentral)).toBe(fogDensity.visited);
  });

  it("[F2.2] covers everything in fog when nothing is uncovered", () => {
    expect(new Set(rasterizeFog(new Map(), bounds, 16))).toEqual(new Set([fogDensity.fog]));
  });
});

describe("fog reveal", () => {
  it("[F2.2] burns off as far as the farthest pixel that lost fog and no farther", () => {
    const n = 8;
    const before = new Uint8Array(n * n).fill(fogDensity.fog);
    before[n * n - 1] = fogDensity.visited;
    const after = before.slice();
    after[n * n - 1] = fogDensity.fog;
    after[2 * n + 5] = fogDensity.visited;
    after[2 * n + 3] = fogDensity.seen;
    const center: [number, number] = [2.5 / n, 2.5 / n];

    expect(revealReach(before, after, n, center, 1)).toBeCloseTo(4 / n);
    expect(revealReach(before, after, n, center, 2)).toBeCloseTo(7 / n);
  });
});

describe("fog colors", () => {
  it("reads token colors in every form the CSS build writes them", () => {
    const rgba = (v: string) =>
      colorVector(v)
        .toArray()
        .map((n) => Math.round(n * 255));
    expect(rgba("#0b7a75")).toEqual([11, 122, 117, 255]);
    expect(rgba("#0b7a7573")).toEqual([11, 122, 117, 115]);
    expect(rgba("#fff")).toEqual([255, 255, 255, 255]);
    expect(rgba("#0008")).toEqual([0, 0, 0, 136]);
    expect(rgba("rgb(150 236 228 / 0.7)")).toEqual([150, 236, 228, 179]);
  });
});

describe("fog renderer", () => {
  it("[F2.6] gives tier 0 and 1 the 2D fog and no WebGL the SVG map", () => {
    expect(fogRenderer({ webgl: true, tier: 0, force2d: false })).toBe("map-fill");
    expect(fogRenderer({ webgl: true, tier: 1, force2d: false })).toBe("map-fill");
    expect(fogRenderer({ webgl: false, tier: 3, force2d: false })).toBe("svg");
  });

  it("[F2.6] gives tier 2 the light shader, tier 3 the full one, and Force 2D wins", () => {
    expect(fogRenderer({ webgl: true, tier: 2, force2d: false })).toBe("shader-light");
    expect(fogRenderer({ webgl: true, tier: 3, force2d: false })).toBe("shader-full");
    expect(fogRenderer({ webgl: true, tier: 3, force2d: true })).toBe("map-fill");
  });
});
