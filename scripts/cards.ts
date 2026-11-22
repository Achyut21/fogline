import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { cardSchema, type StationCard } from "@/lib/cards";
import { stationSchema } from "@/lib/gtfs/types";
import { log } from "@/lib/log";
import { placeSchema } from "@/lib/places/types";
import { writeFact } from "./cards/fact";
import { pickSpot } from "./cards/spot";
import { articleUrl, articlesNear, imageFor, rankArticles } from "./cards/wiki";

// pnpm data:cards: one stop card per station (F3.3, DATA 2.4). A fact from the most notable
// nearby Wikipedia article (600 m), written by Gemini from the intro only, the article's freely
// licensed image with its credit, and one nearby all-ages spot. Run data:places and data:grades
// first. Gemini needs GOOGLE_GENERATIVE_AI_API_KEY, which the package script loads from .env.

const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
const radiusM = 600;
const articlesToTry = 3;

const read = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"));
const stations = z.array(stationSchema).parse(await read("data/stations.json"));
const places = z.array(placeSchema).parse(await read("data/places.json"));

const used = new Set<number>();
const missing: string[] = [];
const cards: StationCard[] = [];
for (const [turn, station] of stations.entries()) {
  const ranked = rankArticles(await articlesNear(station.lat, station.lon, radiusM), used);
  let story: StationCard["story"] = null;
  let image: StationCard["image"] = null;
  for (const article of ranked.slice(0, articlesToTry)) {
    const fact = await writeFact(model, article.title, article.extract);
    if (fact.kind === "unavailable") {
      missing.push(station.id);
      log.info("data:cards got no answer from Gemini; rerun to fill it", {
        station: station.id,
        reason: fact.reason,
      });
      break;
    }
    if (fact.kind === "rejected") {
      log.info("data:cards found no usable sentence", {
        station: station.id,
        article: article.title,
      });
      continue;
    }
    used.add(article.pageid);
    story = { title: article.title, url: articleUrl(article.title), fact: fact.sentence };
    image = article.pageimage ? await imageFor(article.pageimage) : null;
    break;
  }
  cards.push(
    cardSchema.parse({
      station: station.id,
      story,
      image,
      spot: pickSpot(places, station.id, turn),
    }),
  );
}

await writeFile(
  "data/station-cards.json",
  `[\n${cards.map((c) => JSON.stringify(c)).join(",\n")}\n]\n`,
);
log.info("data:cards wrote data/station-cards.json", {
  model,
  cards: cards.length,
  withStory: cards.filter((c) => c.story).length,
  withImage: cards.filter((c) => c.image).length,
  withSpot: cards.filter((c) => c.spot).length,
  geminiUnavailable: missing.join(" ") || null,
});
