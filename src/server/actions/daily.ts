"use server";

import { z } from "zod";
import { revealAround } from "@/lib/geo/cells";
import { calendarDateOf } from "@/lib/time";
import { data } from "@/server/data";
import { dailyState, type DailyState } from "@/server/daily";
import { getDb } from "@/server/db/client";
import { puzzleResults, revealedCells } from "@/server/db/schema";
import { currentProfile } from "@/server/profile";
import { playGuesses } from "@/server/puzzle";
import { normalizeGuess, type GuessError } from "@/lib/puzzle";

// One guess at today's puzzle (F7.2). The server keeps the guesses, so the board survives a reload
// and a streak can't be faked; a solve clears the fog around the event's venue (F7.3).

const input = z.object({ guess: z.string().trim().min(1).max(20) });

export type GuessResult =
  | { kind: "no-profile" }
  | { kind: "rejected"; error: GuessError }
  | { kind: "played"; state: DailyState; newCells: number };

export async function submitGuess(raw: unknown): Promise<GuessResult> {
  const { guess } = input.parse(raw);
  const profile = await currentProfile();
  if (!profile) return { kind: "no-profile" };
  const db = getDb();
  const now = new Date();
  const date = calendarDateOf(now);
  const before = await dailyState(db, profile, now);
  const guesses = [...before.guesses, guess];
  const play = playGuesses(data.events(), new Set(data.words().words), date, guesses);
  if (play.kind === "no-puzzle") return { kind: "rejected", error: "finished" };
  if (play.kind === "rejected") return { kind: "rejected", error: play.error };
  const solved = play.status === "solved";
  const stored = guesses.map(normalizeGuess);
  await db
    .insert(puzzleResults)
    .values({ profileId: profile.id, date, guesses: stored, solved, solvedAt: solved ? now : null })
    .onConflictDoUpdate({
      target: [puzzleResults.profileId, puzzleResults.date],
      set: { guesses: stored, solved, solvedAt: solved ? now : null },
    });
  let newCells = 0;
  if (play.revealFog && play.event) {
    const { cells, state } = revealAround("puzzle", play.event);
    const added = await db
      .insert(revealedCells)
      .values(cells.map((h3) => ({ profileId: profile.id, h3, state, source: "puzzle" as const })))
      .onConflictDoNothing()
      .returning({ h3: revealedCells.h3 });
    newCells = added.length;
  }
  return { kind: "played", state: await dailyState(db, profile, now), newCells };
}
