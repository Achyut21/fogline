import { haversineM, type LatLon } from "./distance";

// Distance along a shape polyline, measured the way scripts/gtfs/build.ts places stations on it
// (DATA 3.4), so positions and station `meters` share one scale.

const earthRadiusM = 6_371_008.8;

/** Meters from the first point to each point of a [lat, lon] polyline. */
export function cumulativeMeters(points: readonly (readonly [number, number])[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    const [lat1, lon1] = points[i - 1];
    const [lat2, lon2] = points[i];
    out.push(out[i - 1] + haversineM({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 }));
  }
  return out;
}

/** Meters along the polyline to the point nearest `target`, searching from segment `from` on. */
export function alongLine(
  points: readonly (readonly [number, number])[],
  cumulative: readonly number[],
  target: LatLon,
  from = 0,
): { meters: number; segment: number } {
  const scale = (Math.PI / 180) * earthRadiusM;
  const cos = Math.cos((target.lat * Math.PI) / 180);
  const planar = (lat: number, lon: number) => ({ x: lon * scale * cos, y: lat * scale });
  const p = planar(target.lat, target.lon);
  let best = { distance: Infinity, meters: 0, segment: from };
  for (let i = Math.max(from, 0); i < points.length - 1; i++) {
    const a = planar(points[i][0], points[i][1]);
    const b = planar(points[i + 1][0], points[i + 1][1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length2 = dx * dx + dy * dy;
    const t =
      length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
    const distance = Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
    if (distance < best.distance) {
      best = {
        distance,
        meters: cumulative[i] + t * (cumulative[i + 1] - cumulative[i]),
        segment: i,
      };
    }
  }
  return { meters: best.meters, segment: best.segment };
}
