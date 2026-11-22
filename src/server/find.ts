import { createHash } from "node:crypto";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { matchPlaces, parseGrounded, type FindFilters } from "@/lib/find";
import { data } from "@/server/data";
import type { Db } from "@/server/db/client";
import { aiCache } from "@/server/db/schema";
import { minutesFromHome } from "@/server/station-sheet";
import { stationById } from "@/server/stations";

// Find it and taste of home (F14) on the server. Gemini only names a dish or places and quotes
// reviews; which spots are shown, how far they are and every rule applied come from our data.
// Answers are cached in `ai_cache` by model and prompt, so a repeat search makes no new call.

const model = () => process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const boston = { latitude: 42.3555, longitude: -71.0603 };

async function cached<T>(db: Db, prompt: string, schema: z.ZodType<T>, run: () => Promise<T>) {
  const key = createHash("sha256").update(`${model()}\n${prompt}`).digest("hex");
  const [hit] = await db.select().from(aiCache).where(eq(aiCache.key, key)).limit(1);
  const parsed = hit ? schema.safeParse(hit.output) : null;
  if (parsed?.success) return parsed.data;
  const output = await run();
  await db.insert(aiCache).values({ key, model: model(), output }).onConflictDoNothing();
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

/** Places that serve `what` near Boston, each with a review quote, from Maps grounding (F14.2). */
export async function groundedPlaces(db: Db, what: string) {
  const prompt = `List up to 8 restaurants or cafes in Boston, Cambridge, Somerville or Brookline for: ${what}. One per line, exactly: Name | a short quote from a Google Maps review that mentions it. Only places with such a review. No other text.`;
  return cached(db, prompt, groundedSchema, async () => {
    const { text } = await generateText({
      model: google(model()),
      tools: { google_maps: google.tools.googleMaps({}) },
      providerOptions: { google: { retrievalConfig: { latLng: boston } } },
      prompt,
    });
    return parseGrounded(text);
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
