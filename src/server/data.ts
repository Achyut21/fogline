import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { cardSchema } from "@/lib/cards";
import { eventSchema, wordsFileSchema } from "@/lib/events";
import { graphSchema, stationSchema, timetableSchema } from "@/lib/gtfs/types";
import { placeSchema } from "@/lib/places/types";

// The committed data files (ARCHITECTURE section 7), read once per server instance. Server-only:
// the graph and timetable are large, and events.json holds the puzzle answers.

function load<T>(name: string, schema: z.ZodType<T>): () => T {
  let value: T | null = null;
  return () => {
    value ??= schema.parse(
      JSON.parse(readFileSync(path.join(process.cwd(), "data", name), "utf8")),
    );
    return value;
  };
}

export const data = {
  stations: load("stations.json", z.array(stationSchema)),
  graph: load("graph.json", graphSchema),
  timetable: load("timetable.json", timetableSchema),
  places: load("places.json", z.array(placeSchema)),
  events: load("events.json", z.array(eventSchema)),
  words: load("words.json", wordsFileSchema),
  cards: load("station-cards.json", z.array(cardSchema)),
};
