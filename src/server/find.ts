import { createHash } from "node:crypto";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { groundedQuotes, matchPlaces, type FindFilters } from "@/lib/find";
import { data } from "@/server/data";
import type { Db } from "@/server/db/client";
import { aiCache } from "@/server/db/schema";
import { minutesFromHome } from "@/server/station-sheet";
import { stationById } from "@/server/stations";

// Find it and taste of home (F14) on the server. Gemini only names a dish or places and quotes
// reviews; which spots are shown, how far they are and every rule applied come from our data.
// Answers are cached in `ai_cache` by model and prompt, so a repeat search makes no new call.

const model = () => process.env.GEMINI_MODEL ?? "gemini-3.7-flash";
// Maps grounding runs on gemini-3.5-flash and 3.6-flash; Flash-Lite answers from memory without
// grounding data (checked 2026-11-22), so grounded search has its own model.
const groundingModel = () => process.env.GEMINI_GROUNDING_MODEL ?? "gemini-3.5-flash";
const boston = { latitude: 42.3555, longitude: -71.0603 };

async function cached<T>(
  db: Db,
  name: string,
  prompt: string,
  schema: z.ZodType<T>,
  run: () => Promise<T>,
) {
  const key = createHash("sha256").update(`${name}\n${prompt}`).digest("hex");
  const [hit] = await db.select().from(aiCache).where(eq(aiCache.key, key)).limit(1);
  const parsed = hit ? schema.safeParse(hit.output) : null;
  if (parsed?.success) return parsed.data;
  const output = await run();
  await db.insert(aiCache).values({ key, model: name, output }).onConflictDoNothing();
  return output;
}

const dishSchema = z.object({ food: z.boolean(), dish: z.string().max(60) });

/** What dish a photo shows, or `food: false` (F14.1). The photo is used for this call only. */
export async function identifyDish(image: Uint8Array, mediaType: string) {
  const { output } = await generateText({
    model: google(model()),
    output: Output.object({ schema: dishSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Name the dish in this photo in at most 4 plain words, as a menu would. If it shows no food, set food to false and dish to an empty string.",
          },
          { type: "file", mediaType, data: image },
        ],
      },
    ],
  });
  return output;
}

const groundedSchema = z.array(z.object({ name: z.string(), quote: z.string() }));

// The places Maps grounding returned, with Google's text about each.
const groundingSchema = z.object({
  groundingMetadata: z
    .object({
      groundingChunks: z
        .array(
          z.object({
            maps: z.object({ title: z.string(), text: z.string().optional() }).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

const perProfileHourly = 10;
const allHourly = 300;

/** Counts one search against the hourly limits; false once either is used up. */
export async function allowSearch(db: Db, profileId: string, now = new Date()): Promise<boolean> {
  const hour = Math.floor(now.getTime() / 3_600_000);
  const bump = async (key: string) => {
    const rows = await db.execute<{ n: number }>(sql`
      insert into ai_cache (key, model, output) values (${key}, 'limit', '{"n":1}'::jsonb)
      on conflict (key) do update
        set output = jsonb_build_object('n', (ai_cache.output->>'n')::int + 1)
      returning (output->>'n')::int as n`);
    return Number(rows[0]?.n ?? 0);
  };
  // Counters older than the last hour count nothing, so each search clears them.
  await db.execute(
    sql`delete from ai_cache where key like 'limit:find:%' and created_at < ${new Date(now.getTime() - 2 * 3_600_000).toISOString()}`,
  );
  if ((await bump(`limit:find:${profileId}:${hour}`)) > perProfileHourly) return false;
  return (await bump(`limit:find:all:${hour}`)) <= allHourly;
}

/**
 * Places that serve `what` near Boston from Maps grounding, each with a line of Google's own
 * review summary (F14.2). The model's reply is only the trigger; its wording is never shown.
 */
export async function groundedPlaces(db: Db, what: string) {
  const prompt = `List up to 8 restaurants or cafes in Boston, Cambridge, Somerville or Brookline for: ${what}. Use Google Maps.`;
  return cached(db, groundingModel(), prompt, groundedSchema, async () => {
    const { providerMetadata } = await generateText({
      model: google(groundingModel()),
      tools: { google_maps: google.tools.googleMaps({}) },
      providerOptions: { google: { retrievalConfig: { latLng: boston } } },
      prompt,
    });
    const parsed = groundingSchema.safeParse(providerMetadata?.google);
    const chunks = parsed.success ? (parsed.data.groundingMetadata?.groundingChunks ?? []) : [];
    return groundedQuotes(
      chunks.flatMap((chunk) => (chunk.maps ? [chunk.maps] : [])),
      what,
    );
  });
}

export type FoundSpot = {
  id: string;
  name: string;
  category: string;
  station: string;
  walkM: number;
  /** Minutes by T from home to the spot's station, null when no trains run now. */
  minutes: number | null;
  quote: string;
  lat: number;
  lon: number;
};

/** Up to 3 known spots in reach by T for a search, with the rules applied (F14.1–F14.3). */
export async function spotsFor(
  db: Db,
  what: string,
  filters: FindFilters,
  home: string,
): Promise<FoundSpot[]> {
  const found = await groundedPlaces(db, what);
  const times = minutesFromHome(home, new Date());
  return matchPlaces(found, data.places(), filters).map(({ place, quote }) => {
    const [near] = place.stations;
    return {
      id: place.id,
      name: place.name,
      category: place.category,
      station: stationById(near.id)?.name ?? near.id,
      walkM: near.walkM,
      minutes: times.get(near.id) ?? null,
      quote,
      lat: place.lat,
      lon: place.lon,
    };
  });
}
