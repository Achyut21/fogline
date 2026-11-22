"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revealAround } from "@/lib/geo/cells";
import { normalizeGuess, type GuessError } from "@/lib/puzzle";
import { calendarDateOf } from "@/lib/time";
import { data } from "@/server/data";
import { dailyState, type DailyState } from "@/server/daily";
import { getDb } from "@/server/db/client";
import { puzzleResults, revealedCells } from "@/server/db/schema";
import { currentProfile } from "@/server/profile";
import { playGuesses } from "@/server/puzzle";

// One guess at today's puzzle (F7.2). The server keeps the guesses, so the board survives a reload
// and a streak can't be faked; a solve clears the fog around the event's venue (F7.3). The row is
// locked while a guess is checked, so guesses sent at once are played one after another and the
// six-guess limit holds.

const input = z.object({ guess: z.string().trim().min(1).max(20) });

export type GuessResult =
  | { kind: "no-profile" }
  | { kind: "rejected"; error: GuessError | "no-puzzle" }
  | { kind: "played"; state: DailyState; newCells: number };

export async function submitGuess(raw: unknown): Promise<GuessResult> {
  const { guess } = input.parse(raw);
  const profile = await currentProfile();
  if (!profile) return { kind: "no-profile" };
  const db = getDb();
  const now = new Date();
  const date = calendarDateOf(now);
  const outcome = await db.transaction(async (tx) => {
    await tx.insert(puzzleResults).values({ profileId: profile.id, date }).onConflictDoNothing();
    const [row] = await tx
      .select({ guesses: puzzleResults.guesses })
      .from(puzzleResults)
      .where(and(eq(puzzleResults.profileId, profile.id), eq(puzzleResults.date, date)))
      .for("update");
    const guesses = [...(row?.guesses ?? []), guess];
    const play = playGuesses(data.events(), new Set(data.words().words), date, guesses);
    if (play.kind === "no-puzzle")
      return { kind: "rejected" as const, error: "no-puzzle" as const };
    if (play.kind === "rejected") return { kind: "rejected" as const, error: play.error };
    const solved = play.status === "solved";
    await tx
      .update(puzzleResults)
      .set({ guesses: guesses.map(normalizeGuess), solved, solvedAt: solved ? now : null })
      .where(and(eq(puzzleResults.profileId, profile.id), eq(puzzleResults.date, date)));
    if (!play.revealFog || !play.event) return { kind: "played" as const, newCells: 0 };
    const { cells, state } = revealAround("puzzle", play.event);
    const added = await tx
      .insert(revealedCells)
      .values(cells.map((h3) => ({ profileId: profile.id, h3, state, source: "puzzle" as const })))
      .onConflictDoNothing()
      .returning({ h3: revealedCells.h3 });
    return { kind: "played" as const, newCells: added.length };
  });
  if (outcome.kind === "rejected") return outcome;
  return { kind: "played", state: await dailyState(db, profile, now), newCells: outcome.newCells };
}
