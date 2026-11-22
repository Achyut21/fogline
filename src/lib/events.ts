import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * A real event in `data/events.json`, the answer to one day's puzzle (F7, DATA 2.6). Facts and a
 * link only. Server-only: `word` is the puzzle's answer.
 */
export const eventSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** The New York date whose puzzle reveals this event. */
  date: isoDate,
  title: z.string().min(1),
  venue: z.string().min(1),
  lat: z.number(),
  lon: z.number(),
  startsAt: z.iso.datetime({ offset: true }),
  url: z.url({ protocol: /^https$/ }),
  source: z.string().min(1),
  word: z.string().regex(/^[a-z]{5}$/),
  /** The nearest station and the walk to the venue, about. */
  station: z.object({ id: z.string(), walkM: z.number().int().nonnegative() }),
});
export type PuzzleEvent = z.infer<typeof eventSchema>;

/** `data/words.json`: the valid guesses and where they come from (DATA 2.7). */
export const wordsFileSchema = z.object({
  source: z.url(),
  license: z.string(),
  words: z.array(z.string().regex(/^[a-z]{5}$/)).min(1),
});
