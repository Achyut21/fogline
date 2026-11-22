import { and, eq, gte } from "drizzle-orm";
import { addDays, calendarDateOf } from "@/lib/time";
import { puzzleFor, shareGrid, streak } from "@/lib/puzzle";
import { data } from "@/server/data";
import type { Db } from "@/server/db/client";
import { puzzleResults } from "@/server/db/schema";
import { playGuesses, puzzleBoard, type PuzzlePlay } from "@/server/puzzle";
import { minutesFromHome } from "@/server/station-sheet";
import { stationById } from "@/server/stations";

// Today's puzzle for one profile (F7): the stored guesses replayed against the answer, the streak,
// and the spoiler-free share grid once the game is over.

const streakDays = 60;

export type DailyState = {
  date: string;
  board: { wordLength: number; maxGuesses: number } | null;
  guesses: string[];
  play: Extract<PuzzlePlay, { kind: "played" }> | null;
  streak: number;
  share: string | null;
  /** The event's station and minutes by T from home, once the event is shown (F7.3). */
  eventStation: { name: string; minutes: number | null } | null;
};

export async function dailyState(
  db: Db,
  profile: { id: string; homeStationId: string },
  now = new Date(),
): Promise<DailyState> {
  const date = calendarDateOf(now);
  const results = await db
    .select()
    .from(puzzleResults)
    .where(
      and(
        eq(puzzleResults.profileId, profile.id),
        gte(puzzleResults.date, addDays(date, -streakDays)),
      ),
    );
  const today = results.find((r) => r.date === date);
  const guesses = today?.guesses ?? [];
  const play =
    guesses.length > 0
      ? playGuesses(data.events(), new Set(data.words().words), date, guesses)
      : null;
  const played = play?.kind === "played" ? play : null;
  const event = puzzleFor(data.events(), date);
  return {
    date,
    board: puzzleBoard(data.events(), date),
    guesses,
    play: played,
    streak: streak(results, date),
    share: played && played.status !== "playing" && event ? shareGrid(guesses, event.word) : null,
    eventStation: played?.event
      ? {
          name: stationById(played.event.station.id)?.name ?? played.event.station.id,
          minutes: minutesFromHome(profile.homeStationId, now).get(played.event.station.id) ?? null,
        }
      : null,
  };
}
