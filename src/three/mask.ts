import { cellOf, type CellState } from "@/lib/geo/cells";

// One byte per pixel: how much fog covers that spot (DESIGN section 9, F2.2). Seen cells keep a
// thin layer, visited cells are clear. The shader softens the hex edges when it samples.
export const fogDensity = { fog: 255, seen: 110, visited: 0 } as const;

export type Bounds = { west: number; south: number; east: number; north: number };

const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const latitudeOf = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90;

/** Rows run north to south and are evenly spaced in Web Mercator, like the map's own pixels. */
export function rasterizeFog(
  states: ReadonlyMap<string, CellState>,
  bounds: Bounds,
  size: number,
): Uint8Array {
  const mask = new Uint8Array(size * size);
  const top = mercatorY(bounds.north);
  const bottom = mercatorY(bounds.south);
  for (let row = 0; row < size; row++) {
    const lat = latitudeOf(top + ((bottom - top) * (row + 0.5)) / size);
    for (let col = 0; col < size; col++) {
      const lon = bounds.west + ((bounds.east - bounds.west) * (col + 0.5)) / size;
      const state = states.get(cellOf({ lat, lon }));
      mask[row * size + col] = state ? fogDensity[state] : fogDensity.fog;
    }
  }
  return mask;
}
