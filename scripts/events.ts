import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { wordsFileSchema } from "@/lib/events";
import { stationSchema } from "@/lib/gtfs/types";
import { log } from "@/lib/log";
import { curatedSchema, toEvents } from "./events/build";

// pnpm data:events: publishes the hand-checked events in scripts/events/curated.json to
// data/events.json, adding each venue's nearest station (DATA 2.6). Run data:words first. It
// refuses to write anything while an entry is unchecked or invalid.

const read = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"));

const curated = z.array(curatedSchema).parse(await read("scripts/events/curated.json"));
const stations = z.array(stationSchema).parse(await read("data/stations.json"));
const words = new Set(wordsFileSchema.parse(await read("data/words.json")).words);

const events = toEvents(curated, stations, words);
await writeFile("data/events.json", `[\n${events.map((e) => JSON.stringify(e)).join(",\n")}\n]\n`);
log.info("data:events wrote data/events.json", {
  events: events.length,
  first: events[0]?.date ?? null,
  last: events.at(-1)?.date ?? null,
});
