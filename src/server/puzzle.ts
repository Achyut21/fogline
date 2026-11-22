import { z } from "zod";
import type { PuzzleEvent } from "@/lib/events";
import {
  checkGuess,
  feedback,
  gameState,
  maxGuesses,
  normalizeGuess,
  puzzleFor,
  wordLength,
  type GuessError,
  type LetterResult,
} from "@/lib/puzzle";

/** The guesses so far, oldest first, the last one new (F7.2). */
export const guessInput = z.object({
  guesses: z.array(z.string().max(20)).min(1).max(maxGuesses),
});

export type RevealedEvent = Omit<PuzzleEvent, "word">;

export type PuzzlePlay =
  | { kind: "no-puzzle"; date: string }
  | { kind: "rejected"; date: string; error: GuessError }
  | {
      kind: "played";
      date: string;
      rows: LetterResult[][];
      status: "playing" | "solved" | "failed";
      /** Shown once solved or lost (F7.3, F7.7). */
      event: RevealedEvent | null;
      /** True only when solved: clear fog around the venue (F7.3). */
      revealFog: boolean;
    };

/** Today's puzzle without its answer, for the board (F7.1). */
export function puzzleBoard(events: readonly PuzzleEvent[], date: string) {
  return puzzleFor(events, date) ? { date, wordLength, maxGuesses } : null;
}

/**
 * Checks every guess in order against the date's answer, so earlier guesses can't be letter probes.
 * The answer never leaves the server; the event is returned only once the game is over
 * (F7.1–F7.3, F7.7).
 */
export function playGuesses(
  events: readonly PuzzleEvent[],
  valid: ReadonlySet<string>,
  date: string,
  guesses: readonly string[],
): PuzzlePlay {
  const event = puzzleFor(events, date);
  if (!event) return { kind: "no-puzzle", date };
  const played: string[] = [];
  for (const guess of guesses) {
    const error = checkGuess(guess, valid, played, event.word);
    if (error) return { kind: "rejected", date, error };
    played.push(normalizeGuess(guess));
  }
  const state = gameState(played, event.word);
  const revealed: RevealedEvent = {
    id: event.id,
    date: event.date,
    title: event.title,
    venue: event.venue,
    lat: event.lat,
    lon: event.lon,
    startsAt: event.startsAt,
    url: event.url,
    source: event.source,
    station: event.station,
  };
  return {
    kind: "played",
    date,
    rows: played.map((guess) => feedback(guess, event.word)),
    status: state.status,
    event: state.revealEvent ? revealed : null,
    revealFog: state.revealFog,
  };
}
