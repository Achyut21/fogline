// Which fog the device gets (DESIGN section 9, F2.6, D-050 flag 1). GPU tiers come from
// @pmndrs/detect-gpu: 0 and 1 get the 2D fog, 2 a lighter shader, 3 everything. Without WebGL
// MapLibre can't draw either, so the map itself falls back to SVG.

export type FogRenderer = "shader-full" | "shader-light" | "map-fill" | "svg";

export function fogRenderer(input: {
  webgl: boolean;
  tier: number;
  force2d: boolean;
}): FogRenderer {
  if (!input.webgl) return "svg";
  if (input.force2d || input.tier <= 1) return "map-fill";
  return input.tier === 2 ? "shader-light" : "shader-full";
}

export const shaderQuality = {
  "shader-full": { octaves: 3, maxDpr: 2 },
  "shader-light": { octaves: 2, maxDpr: 1.5 },
} as const;
