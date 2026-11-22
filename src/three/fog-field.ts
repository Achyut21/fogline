import type { ShaderMaterial, Texture } from "three";
import { duration } from "@/lib/motion";
import type { Bounds } from "./mask";

// The area the fog mask covers: every subway station (Riverside to Wonderland, Oak Grove to
// Braintree) with about 1.2 km to spare, so any home station's cells show. Outside it, out to
// fogExtent, the shader and the 2D fill draw plain fog. At 256 pixels a side, a resolution-9
// cell is still about 3.7 pixels across.
export const fogBounds: Bounds = { west: -71.268, south: 42.196, east: -70.977, north: 42.449 };
export const fogExtent: Bounds = {
  west: fogBounds.west - 1,
  south: fogBounds.south - 1,
  east: fogBounds.east + 1,
  north: fogBounds.north + 1,
};
export const maskSize = 256;

/** MapLibre's Mercator units: x and y run from 0 to 1, y grows southward. */
export function mercator(lon: number, lat: number) {
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return { x: (lon + 180) / 360, y: (180 - (180 / Math.PI) * y) / 360 };
}

const nw = mercator(fogBounds.west, fogBounds.north);
const se = mercator(fogBounds.east, fogBounds.south);

export const maskAspect = (se.x - nw.x) / (se.y - nw.y);

export function maskUv(lon: number, lat: number): [number, number] {
  const p = mercator(lon, lat);
  return [(p.x - nw.x) / (se.x - nw.x), (p.y - nw.y) / (se.y - nw.y)];
}

export type FogField = {
  tick(now: number): void;
  reveal(next: Texture, center: [number, number], reach: number, reduced: boolean): void;
  point(uv: [number, number] | null): void;
  animating(): boolean;
};

// Drives the shader's time and reveal uniforms. Drift stops with reduced motion; a reveal burns
// outward to `reach` over duration.reveal, or crossfades over duration.fast with reduced motion.
// Each reveal disposes the mask texture it drops.
export function createFogField(material: ShaderMaterial, reduced: () => boolean): FogField {
  const u = material.uniforms;
  let started = -1;
  let length = duration.reveal * 1000;
  return {
    tick(now) {
      if (!reduced()) u.uTime.value = now / 1000;
      if (started >= 0) {
        const progress = Math.min(1, (now - started) / length);
        u.uProgress.value = progress;
        if (progress === 1) started = -1;
      }
    },
    reveal(next, center, reach, reducedMotion) {
      if (u.uMaskBefore.value !== u.uMaskAfter.value) u.uMaskBefore.value.dispose();
      u.uMaskBefore.value = u.uMaskAfter.value;
      u.uMaskAfter.value = next;
      u.uRevealCenter.value.set(center[0], center[1]);
      u.uRevealReach.value = reach;
      u.uRadial.value = reducedMotion ? 0 : 1;
      u.uProgress.value = 0;
      length = (reducedMotion ? duration.fast : duration.reveal) * 1000;
      started = performance.now();
    },
    point(uv) {
      u.uPointer.value.set(uv ? uv[0] : -1, uv ? uv[1] : -1);
    },
    animating() {
      return started >= 0 || !reduced();
    },
  };
}
