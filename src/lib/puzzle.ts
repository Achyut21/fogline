import { addDays } from "@/lib/time";

export const wordLength = 5;
export const maxGuesses = 6;

export type LetterResult = "correct" | "present" | "absent";
export type GuessError = "length" | "not-a-word" | "finished";
export type GameStatus = "playing" | "solved" | "failed";

/** The event whose word is the answer on a New York date, or null when none is scheduled (F7.1). */
export function puzzleFor<T extends { date: string }>(
  events: readonly T[],
  date: string,
): T | null {
  return events.find((event) => event.date === date) ?? null;
}

export function normalizeGuess(guess: string): string {
  return guess.trim().toLowerCase();
}

/** Why a guess can't be played, or null when it can (F7.2). */
export function checkGuess(
  guess: string,
  valid: ReadonlySet<string>,
  previous: readonly string[],
  answer: string,
): GuessError | null {
  if (gameState(previous, answer).status !== "playing") return "finished";
  const word = normalizeGuess(guess);
  if (!/^[a-z]+$/.test(word) || word.length !== wordLength) return "length";
  return valid.has(word) ? null : "not-a-word";
}

/**
 * Correct, present or absent for each letter (F7.2). Correct letters are matched first; a
 * repeated letter is present only as many times as the answer has it left over.
 */
export function feedback(guess: string, answer: string): LetterResult[] {
  const word = normalizeGuess(guess);
  const results: LetterResult[] = [...word].map((letter, i) =>
    letter === answer[i] ? "correct" : "absent",
  );
  const left = new Map<string, number>();
  [...answer].forEach((letter, i) => {
    if (results[i] !== "correct") left.set(letter, (left.get(letter) ?? 0) + 1);
  });
  [...word].forEach((letter, i) => {
    const count = left.get(letter) ?? 0;
    if (results[i] === "absent" && count > 0) {
      results[i] = "present";
      left.set(letter, count - 1);
    }
  });
  return results;
}

/**
 * Where a game stands after its guesses. Solving reveals the event and clears fog around the
 * venue; failing all six still reveals the event, without the fog (F7.3, F7.7).
 */
export function gameState(
  guesses: readonly string[],
  answer: string,
): { status: GameStatus; revealEvent: boolean; revealFog: boolean } {
  const played = guesses.slice(0, maxGuesses);
  const solved = played.some((guess) => normalizeGuess(guess) === answer);
  if (solved) return { status: "solved", revealEvent: true, revealFog: true };
  if (guesses.length >= maxGuesses)
    return { status: "failed", revealEvent: true, revealFog: false };
  return { status: "playing", revealEvent: false, revealFog: false };
}

const squares: Record<LetterResult, string> = { correct: "🟩", present: "🟨", absent: "⬛" };

/** The spoiler-free share grid: one row of squares per guess, no letters (F7.5). */
export function shareGrid(guesses: readonly string[], answer: string): string {
  return guesses
    .slice(0, maxGuesses)
    .map((guess) =>
      feedback(guess, answer)
        .map((result) => squares[result])
        .join(""),
    )
    .join("\n");
}

/**
 * Consecutive solved days ending today, or ending yesterday while today's puzzle is still open.
 * A missed or failed day resets it (F7.6).
 */
export function streak(
  results: readonly { date: string; solved: boolean; guesses: readonly string[] }[],
  today: string,
): number {
  const solved = new Set(results.filter((r) => r.solved).map((r) => r.date));
  const todays = results.find((r) => r.date === today);
  const todayOpen = !todays || (!todays.solved && todays.guesses.length < maxGuesses);
  let day = solved.has(today) || !todayOpen ? today : addDays(today, -1);
  let count = 0;
  while (solved.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
