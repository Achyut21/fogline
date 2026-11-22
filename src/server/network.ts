import { z } from "zod";
import type { MapLine, MapStation } from "@/components/map/fog-map";
import { regionSchema, type Region } from "@/lib/geo/regions";
import rawRegions from "../../data/neighborhoods-h3.json";
import rawShapes from "../../data/shapes.json";
import { stations } from "./stations";

const shapeSchema = z.object({
  pattern: z.string(),
  route: z.string(),
  direction: z.number(),
  points: z.array(z.tuple([z.number(), z.number()])),
});

const colors: Record<string, MapLine["color"]> = {
  Red: "red",
  Mattapan: "red",
  Orange: "orange",
  Blue: "blue",
};

// One drawn line per route pattern, in [lon, lat] for MapLibre. Green branches share the green.
export const mapLines: readonly MapLine[] = z
  .array(shapeSchema)
  .parse(rawShapes)
  .map((shape) => ({
    route: shape.route,
    color: colors[shape.route] ?? "green",
    coordinates: shape.points.map(([lat, lon]) => [lon, lat]),
  }));

export const mapStations: readonly MapStation[] = stations.map((s) => ({
  id: s.id,
  name: s.name,
  lon: s.lon,
  lat: s.lat,
}));

export const regions: readonly Region[] = z.array(regionSchema).parse(rawRegions);
