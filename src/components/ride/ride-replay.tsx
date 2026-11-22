"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isLine, LineBadge } from "@/components/display/line-badge";
import { StatTile } from "@/components/display/stat-tile";
import { StopCard } from "@/components/map/stop-card";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ride } from "@/copy";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { recordReplayStop } from "@/server/actions/ride";
import type { SheetCard } from "@/server/station-sheet";

export type ReplayStop = {
  station: string;
  name: string;
  /** Recorded time, Unix ms. */
  at: number;
  card: SheetCard | null;
  /** Miles on the T from the boarding station, null when the shape can't tell. */
  miles: number | null;
};

const speeds = ["1", "5", "10", "20"] as const;
type Speed = (typeof speeds)[number];
const speedOptions = speeds.map((value) => ({
  value,
  label: ride.replay.speedOption(Number(value)),
}));
const tickMs = 250;

/** Screen wake lock while the ride plays (F3.7), where the browser has one. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    const take = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").then(
        (sentinel) => {
          if (released) void sentinel.release();
          else lock = sentinel;
        },
        () => undefined,
      );
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", take);
      void lock?.release();
    };
  }, [active]);
}

/**
 * A recorded trip played back (F3.5): the replay clock runs at 1× to 20×, each stop it reaches
 * shows its card and is recorded on the server (ride event and seen cells), and the ride ends at
 * the last stop or on End with a summary (F3.4).
 */
export function RideReplay({
  tripId,
  from,
  route,
  destination,
  stops,
}: {
  tripId: string;
  from: string;
  route: string;
  destination: string;
  stops: ReplayStop[];
}) {
  const reduce = useReducedMotionConfig();
  const [speed, setSpeed] = useState<Speed>("10");
  const [clock, setClock] = useState(stops[0].at);
  const [ended, setEnded] = useState(false);
  const [newCells, setNewCells] = useState(0);
  const recorded = useRef(-1);

  const reached = stops.findLastIndex((s) => s.at <= clock);
  const last = stops.length - 1;
  const done = ended || reached === last;

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setClock((c) => c + tickMs * Number(speed)), tickMs);
    return () => clearInterval(id);
  }, [done, speed]);

  useEffect(() => {
    while (recorded.current < reached) {
      recorded.current += 1;
      void recordReplayStop({ tripId, from, index: recorded.current }).then((result) => {
        if (result.kind === "recorded") setNewCells((n) => n + result.newCells.length);
      });
    }
  }, [reached, tripId, from]);

  useWakeLock(!done);

  const here = stops[Math.max(reached, 0)];
  const next = stops[reached + 1];

  if (done) {
    const end = stops[Math.max(reached, 0)];
    const minutes = Math.round((end.at - stops[0].at) / 60_000);
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 pt-safe pb-safe">
        <p className="pt-4 text-sm font-bold text-ink-muted">{ride.replay.label}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">{ride.summary.title}</h1>
        <dl className="grid grid-cols-2 gap-2">
          <StatTile label={ride.summary.stops} value={Math.max(reached, 0)} />
          <StatTile
            label={ride.summary.miles}
            value={end.miles ?? 0}
            decimals={1}
            suffix={ride.summary.milesSuffix}
          />
          <StatTile label={ride.summary.minutes} value={minutes} />
          <StatTile label={ride.summary.lines(1)} value={1} />
          <StatTile label={ride.summary.cells} value={newCells} accent className="col-span-2" />
        </dl>
        <p className="text-sm text-ink-muted">{ride.summary.replayNote}</p>
        <Button asChild className="mt-auto w-full">
          <Link href="/">{ride.summary.done}</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-safe pb-safe">
      <header className="flex flex-col gap-1 pt-4">
        <p className="flex items-center gap-2 text-sm font-bold text-ink-muted">
          {isLine(route) && <LineBadge line={route} />}
          {ride.replay.heading(destination)}
          <span className="rounded-full bg-surface-sunken px-2 py-1 text-xs">
            {ride.replay.label}
          </span>
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight" aria-live="polite">
          {here.name}
        </h1>
        <p className="text-ink-muted">
          {next
            ? ride.replay.next(next.name, Math.max(1, Math.ceil((next.at - clock) / 60_000)))
            : ride.replay.arrived}
        </p>
      </header>

      <div className="flex items-center gap-3">
        <SegmentedControl
          label={ride.replay.speed}
          options={speedOptions}
          value={speed}
          onValueChange={setSpeed}
          className="flex-1"
        />
        <Button variant="secondary" onClick={() => setEnded(true)}>
          {ride.replay.end}
        </Button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {here.card && (
          <motion.div
            key={here.station}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: duration.base, ease: ease.standard }}
          >
            <StopCard card={here.card} headingId={`card-${here.station}`} />
          </motion.div>
        )}
      </AnimatePresence>

      <section aria-label={ride.replay.stops} className="flex flex-col gap-1">
        <ol className="flex flex-col">
          {stops.map((s, i) => (
            <li
              key={s.station}
              className={cn(
                "flex min-h-11 items-center gap-3 border-l-2 pl-3",
                i <= reached ? "border-accent font-bold" : "border-rule text-ink-muted",
              )}
            >
              <span className="flex-1">{s.name}</span>
              {i === reached ? (
                <span className="text-xs">{ride.replay.here}</span>
              ) : i < reached ? (
                <span className="text-xs text-ink-muted">{ride.replay.passed}</span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
