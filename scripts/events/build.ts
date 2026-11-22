import { z } from "zod";
import { walkM } from "@/lib/geo/distance";
import { eventSchema, type PuzzleEvent } from "@/lib/events";
import type { Station } from "@/lib/gtfs/types";
import { addDays, calendarDateOf } from "@/lib/time";

const maxWalkM = 600;
const maxDaysAfterPuzzle = 3;

/**
 * One hand-written entry of `scripts/events/curated.json`. A person sets `checked` after opening
 * the link and confirming the date, time, venue and that it's all-ages (DATA 2.6).
 */
export const curatedSchema = eventSchema.omit({ station: true }).extend({
  allAges: z.literal(true),
  checked: z.boolean(),
});
export type CuratedEvent = z.infer<typeof curatedSchema>;
const published = eventSchema.omit({ station: true });

/**
 * The published events: only checked ones, one per date, each answer a real word, each event on
 * its puzzle date or up to 3 days after, each venue within 600 m walking of a station. Throws
 * with every problem found, so nothing half-checked is written.
 */
export function toEvents(
  curated: readonly CuratedEvent[],
  stations: readonly Station[],
  words: ReadonlySet<string>,
): PuzzleEvent[] {
  const problems: string[] = [];
  const seen = { ids: new Set<string>(), dates: new Set<string>() };
  const events: PuzzleEvent[] = [];
  for (const entry of curated) {
    const event = published.parse(entry);
    if (!entry.checked) problems.push(`${event.id}: not checked yet`);
    if (seen.ids.has(event.id)) problems.push(`${event.id}: duplicate id`);
    if (seen.dates.has(event.date)) problems.push(`${event.id}: a second event for ${event.date}`);
    seen.ids.add(event.id);
    seen.dates.add(event.date);
    if (!words.has(event.word)) problems.push(`${event.id}: "${event.word}" isn't in words.json`);
    const day = calendarDateOf(new Date(event.startsAt));
    if (day < event.date || day > addDays(event.date, maxDaysAfterPuzzle)) {
      problems.push(`${event.id}: starts ${day}, not within 3 days from ${event.date}`);
    }
    const [station] = stations
      .map((s) => ({ id: s.id, walkM: Math.round(walkM(event, s)) }))
      .sort((x, y) => x.walkM - y.walkM);
    if (!station || station.walkM > maxWalkM) {
      problems.push(`${event.id}: ${station?.walkM ?? "no"} m from the nearest station`);
      continue;
    }
    events.push({ ...event, station });
  }
  if (problems.length > 0) throw new Error(`Events not published:\n${problems.join("\n")}`);
  return events.sort((a, b) => (a.date < b.date ? -1 : 1));
}
