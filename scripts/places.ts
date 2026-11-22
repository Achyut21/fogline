import { readFileSync } from "node:fs";
import { z } from "zod";
import { log } from "@/lib/log";
import { stationSchema } from "@/lib/gtfs/types";
import { writePlaces } from "./places/file";
import { overpass } from "./places/osm";
import { toPlaces } from "./places/transform";

// pnpm data:places [--refresh]: spots near every station from Overpass, fetched in 9 tiles cached
// under .cache/overpass/ (--refresh fetches them again). Run data:grades afterwards to add
// inspection grades.

const margin = 0.008;
const stations = z
  .array(stationSchema)
  .parse(JSON.parse(readFileSync("data/stations.json", "utf8")));
const box = {
  south: Math.min(...stations.map((s) => s.lat)) - margin,
  west: Math.min(...stations.map((s) => s.lon)) - margin,
  north: Math.max(...stations.map((s) => s.lat)) + margin,
  east: Math.max(...stations.map((s) => s.lon)) + margin,
};

const response = await overpass(box, process.argv.includes("--refresh"));
const places = toPlaces(response.elements, stations);
await writePlaces(places);

const byCategory: Record<string, number> = {};
for (const place of places) byCategory[place.category] = (byCategory[place.category] ?? 0) + 1;
log.info("data:places wrote data/places.json", {
  osmBase: response.osm3s.timestamp_osm_base,
  elements: response.elements.length,
  places: places.length,
  ...byCategory,
});
