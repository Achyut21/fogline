import { describe, expect, it } from "vitest";
import { applyReveal, cellOf, revealAround, type CellState } from "@/lib/geo/cells";
import { fogDensity, rasterizeFog, type Bounds } from "@/three/mask";
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
