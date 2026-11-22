import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { log } from "@/lib/log";
import { geometrySchema, toRegions, type RegionShape } from "./neighborhoods/regions";

// pnpm data:neighborhoods: Boston's BPDA neighborhoods (Analyze Boston) and Cambridge, Somerville
// and Brookline as whole regions (US Census TIGERweb county subdivisions), filled with H3
// resolution-9 cells (DATA 2.5). A cell in no region is "Beyond".

const bpdaPackage =
  "https://data.boston.gov/api/3/action/package_show?id=bpda-neighborhood-boundaries";
const tigerweb =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/1/query";
const towns = ["Cambridge", "Somerville", "Brookline"] as const;

const featuresSchema = <T extends z.ZodType>(properties: T) =>
  z.object({ features: z.array(z.object({ properties, geometry: geometrySchema })) });

async function json(url: URL | string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const resources = z.object({
  result: z.object({ resources: z.array(z.object({ format: z.string(), url: z.string() })) }),
});
const geojsonUrl = resources
  .parse(await json(bpdaPackage))
  .result.resources.find((r) => r.format === "GeoJSON")?.url;
if (!geojsonUrl) throw new Error("The BPDA neighborhoods dataset has no GeoJSON file");
const boston = featuresSchema(z.object({ name: z.string() })).parse(await json(geojsonUrl));

const query = new URL(tigerweb);
query.searchParams.set(
  "where",
  `STATE='25' AND BASENAME IN (${towns.map((t) => `'${t}'`).join(",")})`,
);
query.searchParams.set("outFields", "BASENAME");
query.searchParams.set("outSR", "4326");
query.searchParams.set("f", "geojson");
const cities = featuresSchema(z.object({ BASENAME: z.enum(towns) })).parse(await json(query));

const shapes: RegionShape[] = [
  ...boston.features
    .map((f): RegionShape => ({
      id: slug(f.properties.name),
      name: f.properties.name,
      city: "Boston",
      geometry: f.geometry,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)),
  ...towns.map((town): RegionShape => {
    const feature = cities.features.find((f) => f.properties.BASENAME === town);
    if (!feature) throw new Error(`TIGERweb has no boundary for ${town}`);
    return { id: slug(town), name: town, city: town, geometry: feature.geometry };
  }),
];
const regions = toRegions(shapes);
await writeFile("data/neighborhoods-h3.json", `${JSON.stringify(regions, null, 1)}\n`);

log.info("data:neighborhoods wrote data/neighborhoods-h3.json", {
  regions: regions.length,
  cells: regions.reduce((sum, r) => sum + r.cells.length, 0),
  bostonCells: regions
    .filter((r) => r.city === "Boston")
    .reduce((sum, r) => sum + r.cells.length, 0),
  smallest: regions.reduce((a, b) => (a.cells.length <= b.cells.length ? a : b)).name,
});
