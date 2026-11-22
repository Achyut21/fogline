import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { log } from "@/lib/log";

// overpass-api.de first, then a public mirror with the same data for networks that can't reach
// it. One query per run, cached under .cache/, so Overpass is never hit at runtime (DATA 2.2).
const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const cacheDir = ".cache/overpass";
const grid = 3;

export const osmElementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.number().int(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  tags: z.record(z.string(), z.string()).default({}),
});
export type OsmElement = z.infer<typeof osmElementSchema>;

const responseSchema = z.object({
  osm3s: z.object({ timestamp_osm_base: z.string() }),
  elements: z.array(osmElementSchema),
});
export type OsmResponse = z.infer<typeof responseSchema>;

export type Box = { south: number; west: number; north: number; east: number };

export function query(box: Box): string {
  const bbox = `(${box.south},${box.west},${box.north},${box.east})`;
  return `[out:json][timeout:180];(
nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|nightclub|ice_cream|food_court|biergarten|arts_centre|theatre|cinema)$"]${bbox};
nwr["tourism"~"^(museum|gallery)$"]${bbox};
nwr["leisure"="park"]${bbox};
);out center tags;`;
}

/** The box cut into a 3 × 3 grid, so each query is small enough for a busy mirror. */
export function tiles(box: Box): Box[] {
  const lat = (i: number) => box.south + ((box.north - box.south) * i) / grid;
  const lon = (j: number) => box.west + ((box.east - box.west) * j) / grid;
  const out: Box[] = [];
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      out.push({ south: lat(i), west: lon(j), north: lat(i + 1), east: lon(j + 1) });
    }
  }
  return out;
}

/** One response from several: each element once (tiles overlap on their edges), oldest data date. */
export function merge(responses: OsmResponse[]): OsmResponse {
  const elements = new Map<string, OsmElement>();
  for (const response of responses) {
    for (const element of response.elements) elements.set(`${element.type}/${element.id}`, element);
  }
  const bases = responses.map((r) => r.osm3s.timestamp_osm_base).sort();
  return { osm3s: { timestamp_osm_base: bases[0] ?? "" }, elements: [...elements.values()] };
}

const attempts = 5;
const backoffMs = 20_000;

/** Overpass answers 429 or 504 when it's busy; those are worth another try after a pause. */
async function download(body: string): Promise<OsmResponse> {
  const failures: string[] = [];
  for (const endpoint of endpoints) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new URLSearchParams({ data: body }),
        signal: AbortSignal.timeout(240_000),
        headers: { "User-Agent": "fogline-data-pipeline" },
      }).catch((error: unknown) => error);
      if (response instanceof Response && response.ok) {
        log.info("data:places fetched Overpass", { endpoint, attempt });
        return responseSchema.parse(await response.json());
      }
      const reason = response instanceof Response ? String(response.status) : String(response);
      failures.push(`${endpoint} (try ${attempt}): ${reason}`);
      const busy = response instanceof Response && [429, 504].includes(response.status);
      if (!busy) break;
      await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
    }
  }
  throw new Error(`Every Overpass endpoint failed: ${failures.join("; ")}`);
}

/** Overpass data for a box, one cached file per tile, so a rerun fetches only missing tiles. */
export async function overpass(box: Box, refresh: boolean): Promise<OsmResponse> {
  await mkdir(cacheDir, { recursive: true });
  const responses: OsmResponse[] = [];
  for (const tile of tiles(box)) {
    const body = query(tile);
    const file = `${cacheDir}/${createHash("sha256").update(body).digest("hex").slice(0, 16)}.json`;
    const cached = refresh ? null : await readFile(file, "utf8").catch(() => null);
    if (cached !== null) {
      responses.push(responseSchema.parse(JSON.parse(cached)));
      continue;
    }
    const fresh = await download(body);
    await writeFile(file, JSON.stringify(fresh));
    responses.push(fresh);
  }
  return merge(responses);
}
