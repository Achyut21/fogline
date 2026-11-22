import { zone } from "@/lib/time";
import type { GuessError, LetterResult } from "@/lib/puzzle";

// The daily puzzle (F7).

const eventFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const daily = {
  pageTitle: "Daily",
  title: "Daily puzzle",
  intro: "Guess the 5-letter word in six tries. It leads to a real event in Boston.",
  streak: (n: number) => (n === 1 ? "1 day streak" : `${n} day streak`),
  board: "Guesses",
  row: (n: number) => `Guess ${n}`,
  letter: (letter: string, result: LetterResult | null) =>
    result === null
      ? letter === ""
        ? "Empty"
        : letter.toUpperCase()
      : `${letter.toUpperCase()}, ${{ correct: "right spot", present: "wrong spot", absent: "not in the word" }[result]}`,
  legend: {
    correct: "Right spot",
    present: "In the word, wrong spot",
    absent: "Not in the word",
  },
  keyboard: "Keyboard",
  enter: "Enter",
  delete: "Delete",
  sending: "Checking",
  errors: {
    length: "Use exactly 5 letters.",
    "not-a-word": "Not in the word list.",
    finished: "Today's puzzle is done. A new one comes at midnight.",
    "no-puzzle": "There's no puzzle for today. Come back after midnight.",
    failed: "Couldn't reach Fogline. Check your connection and try again.",
  } satisfies Record<GuessError | "no-puzzle" | "failed", string>,
  solved: (guesses: number) =>
    guesses === 1 ? "Solved in 1 guess" : `Solved in ${guesses} guesses`,
  failed: "Out of guesses. Here's today's event anyway.",
  newCells: (n: number) =>
    n === 1 ? "1 cell cleared around the venue." : `${n} cells cleared around the venue.`,
  event: {
    heading: "Today's event",
    when: (at: Date) => eventFormat.format(at).replace(/\s(?=[AP]M)/, "\u00a0"),
    station: (name: string, walk: number) => `${name} · about ${walk} min walk`,
    fromHome: (minutes: number) => `${minutes} min by T from home`,
    source: (source: string) => `Details on ${source}`,
    planIt: "Plan it",
  },
  share: "Share result",
  copied: "Result copied",
  shareText: (date: string, grid: string) => `Fogline ${date}\n${grid}`,
  none: {
    title: "No puzzle today",
    body: "Come back after midnight for the next one.",
  },
} as const;
