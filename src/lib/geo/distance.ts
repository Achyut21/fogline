export type LatLon = { lat: number; lon: number };

const earthRadiusM = 6_371_008.8;
const walkFactor = 1.25;
const walkMetersPerMinute = 80;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineM(a: LatLon, b: LatLon): number {
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Straight-line distance stretched for streets. The UI always labels it "about". */
export function walkM(a: LatLon, b: LatLon): number {
  return haversineM(a, b) * walkFactor;
}

export function walkMinutes(meters: number): number {
  return meters / walkMetersPerMinute;
}
