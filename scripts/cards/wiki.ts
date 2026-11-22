import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import type { StationCard } from "@/lib/cards";

// English Wikipedia's API, read with a generic client name. Every response is cached under
// .cache/wiki/, so a rerun reads the same articles and gives the same file.
const api = "https://en.wikipedia.org/w/api.php";
const userAgent = "station-cards-pipeline/1.0";
const cacheDir = ".cache/wiki";
const pauseMs = 300;
const tries = 6;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One request at a time with a short pause, retrying when Wikipedia says it's busy (429 or 503),
 * after its Retry-After or a doubling wait.
 */
async function fetchPolitely(url: URL): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    await wait(pauseMs);
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(60_000),
    });
    if (response.ok) return response.text();
    const busy = response.status === 429 || response.status === 503;
    if (!busy || attempt === tries) {
      throw new Error(`Wikipedia answered ${response.status} for ${url.href}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    await wait(
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000,
    );
  }
}

async function readCache(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function query(params: Record<string, string>): Promise<unknown> {
  const url = new URL(api);
  const all = { action: "query", format: "json", formatversion: "2", ...params };
  for (const [key, value] of Object.entries(all)) url.searchParams.set(key, value);
  await mkdir(cacheDir, { recursive: true });
  const file = `${cacheDir}/${createHash("sha256").update(url.href).digest("hex").slice(0, 16)}.json`;
  const cached = await readCache(file);
  if (cached !== null) return JSON.parse(cached);
  const body = await fetchPolitely(url);
  const parsed: unknown = JSON.parse(body);
  if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
    throw new Error(`Wikipedia answered an error for ${url.href}`);
  }
  await writeFile(file, body);
  return parsed;
}

const pagesSchema = z.object({
  query: z
    .object({
      pages: z.array(
        z.object({
          pageid: z.number(),
          title: z.string(),
          length: z.number().default(0),
          extract: z.string().default(""),
          pageimage: z.string().optional(),
          pageprops: z.record(z.string(), z.string()).default({}),
        }),
      ),
    })
    .default({ pages: [] }),
});
export type Article = z.infer<typeof pagesSchema>["query"]["pages"][number];

/** The 20 nearest articles within `radiusM` of a point, with intro, length and page image, in one request. */
export async function articlesNear(lat: number, lon: number, radiusM: number): Promise<Article[]> {
  return pagesSchema.parse(
    await query({
      generator: "geosearch",
      ggscoord: `${lat}|${lon}`,
      ggsradius: String(radiusM),
      ggslimit: "20",
      ggsnamespace: "0",
      prop: "extracts|pageimages|info|pageprops",
      exintro: "1",
      explaintext: "1",
      exlimit: "max",
      piprop: "name",
    }),
  ).query.pages;
}

const transit =
  /\b(station|stations|line|branch|subway|tunnel|busway|transitway|mbta|railroad|railway|rail|bus|trolley|streetcar)\b/i;
// Cards are the same for everyone, so no bar or nightclub (F1.5), and no violent event.
const adult =
  /\b(bar|pub|tavern|taproom|saloon|lounge|nightclub|night club|brewery|brewpub|speakeasy|cocktail|strip club)\b/i;
const violent = /\b(bombing|massacre|shooting|murder|attack|explosion)\b/i;
const minExtract = 150;

/**
 * The articles a station's card can use, most notable first: the longest of the nearest ones
 * that aren't about transit, a bar or nightclub, a violent event, a list or a disambiguation,
 * with an intro of 150 characters or more, not already used by another card.
 */
export function rankArticles(articles: readonly Article[], used: ReadonlySet<number>): Article[] {
  const about = (a: Article) => `${a.title} ${a.pageprops["wikibase-shortdesc"] ?? ""}`;
  return articles
    .filter(
      (a) =>
        !used.has(a.pageid) &&
        !transit.test(a.title) &&
        !adult.test(about(a)) &&
        !violent.test(about(a)) &&
        !/^list of /i.test(a.title) &&
        !("disambiguation" in a.pageprops) &&
        a.extract.trim().length >= minExtract,
    )
    .sort((a, b) => b.length - a.length || a.pageid - b.pageid);
}

export function articleUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

const metaValue = z.object({ value: z.unknown() });
const imageSchema = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        imageinfo: z
          .array(
            z.object({
              url: z.string(),
              thumburl: z.string().optional(),
              descriptionurl: z.string(),
              extmetadata: z.record(z.string(), metaValue).default({}),
            }),
          )
          .default([]),
      }),
    ),
  }),
});
export type ImageInfo = z.infer<typeof imageSchema>["query"]["pages"][number]["imageinfo"][number];

const text = (value: unknown) =>
  typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&ndash;/g, "–")
        .replace(/&mdash;/g, "—")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
    : "";

/**
 * The image's credit, or null when it can't be shown: not freely licensed (Creative Commons or
 * public domain), marked non-free, or without an author to credit.
 */
export function imageCredit(info: ImageInfo): StationCard["image"] {
  const meta = info.extmetadata;
  const license = text(meta.LicenseShortName?.value);
  const author = text(meta.Artist?.value);
  if (text(meta.NonFree?.value) === "true") return null;
  if (!/^(cc|public domain|pd)/i.test(license) || author === "") return null;
  const licenseUrl = text(meta.LicenseUrl?.value);
  return {
    url: info.thumburl ?? info.url,
    page: info.descriptionurl,
    author,
    license,
    licenseUrl: licenseUrl.startsWith("http") ? licenseUrl : null,
  };
}

export async function imageFor(file: string): Promise<StationCard["image"]> {
  const pages = imageSchema.parse(
    await query({
      titles: `File:${file}`,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "800",
    }),
  ).query.pages;
  const info = pages[0]?.imageinfo[0];
  return info ? imageCredit(info) : null;
}
