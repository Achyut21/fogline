"use client";

import { CalendarX, Delete, Flame, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/system/empty-state";
import { Button } from "@/components/ui/button";
import { daily } from "@/copy";
import type { LetterResult } from "@/lib/puzzle";
import { cn } from "@/lib/utils";
import { submitGuess } from "@/server/actions/daily";
import { InstallPrompt } from "@/components/system/install";
import type { DailyState } from "@/server/daily";

const keyRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"] as const;
const rank: Record<LetterResult, number> = { absent: 0, present: 1, correct: 2 };

/**
 * One letter as a stop on a line: right spot is a filled stop, wrong spot a ringed stop, not in the
 * word a stop left in the fog. Shape carries the result as well as color (F7.2's second cue).
 */
function Stop({ letter, result }: { letter: string; result: LetterResult | null }) {
  return (
    <span
      role="img"
      aria-label={daily.letter(letter, result)}
      data-result={result ?? "empty"}
      className={cn(
        "relative flex size-12 items-center justify-center rounded-full text-xl font-extrabold uppercase",
        result === "correct" && "bg-accent text-accent-ink",
        result === "present" && "border-4 border-accent bg-surface text-ink",
        result === "absent" &&
          "border-2 border-dashed border-rule bg-surface-sunken text-ink-muted",
        result === null && "border-2 border-rule bg-surface text-ink",
      )}
    >
      {letter}
    </span>
  );
}

function Row({
  letters,
  results,
  n,
}: {
  letters: string;
  results: LetterResult[] | null;
  n: number;
}) {
  const width = 5;
  return (
    <li aria-label={daily.row(n)} className="relative flex justify-between">
      <span
        aria-hidden="true"
        className="absolute inset-x-6 top-1/2 h-1 -translate-y-1/2 bg-rule"
      />
      {Array.from({ length: width }, (_, i) => (
        <Stop key={i} letter={letters[i] ?? ""} result={results?.[i] ?? null} />
      ))}
    </li>
  );
}

/** The daily puzzle (F7.1–F7.7): the board, the keyboard, and the event once the game is over. */
export function DailyPuzzle({ initial }: { initial: DailyState }) {
  const [state, setState] = useState(initial);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [newCells, setNewCells] = useState(0);
  const [pending, start] = useTransition();

  const board = state.board;
  const play = state.play;
  const status = play?.status ?? "playing";
  const over = status !== "playing";
  const rows = play?.rows ?? [];

  const known = new Map<string, LetterResult>();
  state.guesses.forEach((guess, r) =>
    [...guess].forEach((letter, i) => {
      const result = rows[r]?.[i];
      const before = known.get(letter);
      if (result && (!before || rank[result] > rank[before])) known.set(letter, result);
    }),
  );

  const send = useCallback(() => {
    if (pending || over) return;
    if (typed.length !== 5) {
      setError(daily.errors.length);
      return;
    }
    const guess = typed;
    start(async () => {
      try {
        const result = await submitGuess({ guess });
        if (result.kind === "played") {
          setState(result.state);
          setTyped("");
          setError(null);
          setNewCells(result.newCells);
        } else if (result.kind === "rejected") setError(daily.errors[result.error]);
      } catch (e) {
        if (!(e instanceof Error)) throw e;
        setError(daily.errors.failed);
      }
    });
  }, [over, pending, typed]);

  const press = useCallback(
    (key: string) => {
      if (over || pending) return;
      if (key === "enter") send();
      else if (key === "delete") setTyped((t) => t.slice(0, -1));
      else if (/^[a-z]$/.test(key)) setTyped((t) => (t.length < 5 ? t + key : t));
      setError(null);
    },
    [over, pending, send],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      const key =
        e.key === "Enter" ? "enter" : e.key === "Backspace" ? "delete" : e.key.toLowerCase();
      if (key === "enter" || key === "delete" || /^[a-z]$/.test(key)) {
        e.preventDefault();
        press(key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  async function share() {
    if (!state.share) return;
    const text = daily.shareText(state.date, state.share);
    if (navigator.share) {
      await navigator.share({ text }).catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) throw e;
      });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast(daily.copied);
  }

  if (!board) {
    return (
      <main className="flex flex-1 flex-col justify-center px-4 pt-safe">
        <EmptyState icon={CalendarX} title={daily.none.title} body={daily.none.body} />
      </main>
    );
  }

  const event = play?.event ?? null;
  const lines = Array.from({ length: board.maxGuesses }, (_, i) =>
    i < state.guesses.length
      ? { letters: state.guesses[i], results: rows[i] ?? null }
      : { letters: i === state.guesses.length && !over ? typed : "", results: null },
  );

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 pt-safe pb-4">
      <header className="flex items-start justify-between gap-3 pt-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">{daily.title}</h1>
          <p className="text-sm text-ink-muted">{daily.intro}</p>
        </div>
        {state.streak > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-sunken px-3 py-1 text-sm font-bold">
            <Flame aria-hidden="true" className="size-4 text-accent" />
            {daily.streak(state.streak)}
          </span>
        )}
      </header>

      <ol aria-label={daily.board} className="flex flex-col gap-3">
        {lines.map((line, i) => (
          <Row key={i} n={i + 1} letters={line.letters} results={line.results} />
        ))}
      </ol>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted">
        {(["correct", "present", "absent"] as const).map((result) => (
          <li key={result} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "size-4 rounded-full",
                result === "correct" && "bg-accent",
                result === "present" && "border-4 border-accent",
                result === "absent" && "border-2 border-dashed border-rule bg-surface-sunken",
              )}
            />
            {daily.legend[result]}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {over && event ? (
        <section
          aria-labelledby="event"
          className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm"
        >
          <p role="status" className="text-sm font-bold text-accent">
            {status === "solved" ? daily.solved(state.guesses.length) : daily.failed}
          </p>
          <h2 id="event" className="text-sm font-bold text-ink-muted">
            {daily.event.heading}
          </h2>
          <p className="text-xl font-extrabold tracking-tight">{event.title}</p>
          <p className="text-sm">
            {event.venue} · {daily.event.when(new Date(event.startsAt))}
          </p>
          {state.eventStation && (
            <p className="text-sm text-ink-muted">
              {daily.event.station(
                state.eventStation.name,
                Math.max(1, Math.round(event.station.walkM / 80)),
              )}
              {state.eventStation.minutes !== null &&
                ` · ${daily.event.fromHome(state.eventStation.minutes)}`}
            </p>
          )}
          {newCells > 0 && <p className="text-sm font-semibold">{daily.newCells(newCells)}</p>}
          <a href={event.url} className="text-sm text-ink-muted underline">
            {daily.event.source(event.source)}
          </a>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/plans/new?at=${encodeURIComponent(event.startsAt)}&event=${event.id}`}>
                {daily.event.planIt}
              </Link>
            </Button>
            {state.share && (
              <Button variant="secondary" onClick={share}>
                <Share2 aria-hidden="true" />
                {daily.share}
              </Button>
            )}
          </div>
        </section>
      ) : (
        <div role="group" aria-label={daily.keyboard} className="mt-auto flex flex-col gap-2">
          {keyRows.map((row, r) => (
            <div key={row} className="flex justify-center gap-1">
              {r === 2 && (
                <button
                  type="button"
                  onClick={() => press("enter")}
                  disabled={pending}
                  className="min-h-12 rounded-md bg-accent px-3 text-sm font-bold text-accent-ink disabled:opacity-50"
                >
                  {pending ? daily.sending : daily.enter}
                </button>
              )}
              {[...row].map((key) => {
                const result = known.get(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => press(key)}
                    aria-label={daily.letter(key, result ?? null)}
                    className={cn(
                      "min-h-12 flex-1 rounded-md text-base font-bold uppercase",
                      result === "correct" && "bg-accent text-accent-ink",
                      result === "present" && "border-2 border-accent bg-surface",
                      result === "absent" && "bg-surface-sunken text-ink-muted line-through",
                      !result && "bg-surface-raised",
                    )}
                  >
                    {key}
                  </button>
                );
              })}
              {r === 2 && (
                <button
                  type="button"
                  onClick={() => press("delete")}
                  aria-label={daily.delete}
                  className="flex min-h-12 items-center rounded-md bg-surface-raised px-3"
                >
                  <Delete aria-hidden="true" className="size-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {over && <InstallPrompt />}
    </main>
  );
}
