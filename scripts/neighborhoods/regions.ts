import { polygonToCells } from "h3-js";
import { z } from "zod";
import { cellResolution } from "@/lib/geo/cells";
import type { Region } from "@/lib/geo/regions";

const ring = z.array(z.tuple([z.number(), z.number()]).rest(z.number()));
export const geometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: z.array(ring) }),
  z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(ring)) }),
]);
export type Geometry = z.infer<typeof geometrySchema>;

export type RegionShape = Omit<Region, "cells"> & { geometry: Geometry };

/** H3 res-9 cells whose centers fall inside a polygon or multipolygon (GeoJSON order). */
export function cellsOf(geometry: Geometry): string[] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const cells = new Set<string>();
  for (const polygon of polygons) {
    const lonLat = polygon.map((r) => r.map(([lon, lat]) => [lon, lat]));
    for (const cell of polygonToCells(lonLat, cellResolution, true)) cells.add(cell);
  }
  return [...cells];
}

/** Every cell in exactly one region: the first region listed that contains it keeps it. */
export function toRegions(shapes: RegionShape[]): Region[] {
  const taken = new Set<string>();
  return shapes.map((shape) => {
    const cells = cellsOf(shape.geometry)
      .filter((cell) => !taken.has(cell))
      .sort();
    for (const cell of cells) taken.add(cell);
    return { id: shape.id, name: shape.name, city: shape.city, cells };
  });
}
