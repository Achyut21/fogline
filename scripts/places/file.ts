import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { placeSchema, type Place } from "@/lib/places/types";

const path = "data/places.json";

export async function readPlaces(): Promise<Place[]> {
  return z.array(placeSchema).parse(JSON.parse(await readFile(path, "utf8")));
}

/** One spot per line, so a refresh shows up as a readable diff. */
export async function writePlaces(places: Place[]): Promise<void> {
  await writeFile(path, `[\n${places.map((p) => JSON.stringify(p)).join(",\n")}\n]\n`);
}
