import type { Metadata } from "next";
import { BottomNav } from "@/components/app/bottom-nav";
import { StatTile } from "@/components/display/stat-tile";
import { howItWorks as copy } from "@/copy";
import { getDb } from "@/server/db/client";
import { cachedHowItWorks } from "@/server/how-it-works";

export const metadata: Metadata = { title: copy.title };
export const dynamic = "force-dynamic";

const recordedAt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// F15.1: live numbers from the hypertables, cached for at most 60 s (F15.2), and every data
// source with its credit.
export default async function HowItWorksPage() {
  const numbers = await cachedHowItWorks(getDb());
  const tables = ["vehicle_positions", "checkins", "ride_events", "noise_readings"] as const;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col gap-6 px-4 pt-safe pb-6">
        <header className="flex flex-col gap-2 pt-4">
          <h1 className="text-2xl font-extrabold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-ink-muted">{copy.intro}</p>
        </header>

        <section aria-labelledby="live-heading" className="flex flex-col gap-3">
          <h2 id="live-heading" className="text-sm font-bold">
            {copy.liveHeading}
          </h2>
          <dl className="grid grid-cols-2 gap-2">
            {tables.map((table) => (
              <StatTile key={table} label={copy.rows[table]} value={numbers.rows[table]} />
            ))}
          </dl>
          <dl className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-ink-muted">{copy.compression}</dt>
              <dd className="text-sm font-bold tabular-nums">
                {numbers.compressionRatio === null
                  ? copy.compressionNone
                  : `${numbers.compressionRatio.toFixed(1)}×`}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-ink-muted">{copy.lastRun}</dt>
              <dd className="text-sm font-bold tabular-nums">
                {numbers.lastRecorderRun === null
                  ? copy.lastRunNone
                  : recordedAt.format(numbers.lastRecorderRun)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-sm text-ink-muted">
                {copy.solver}
                <span className="block text-xs">{copy.solverNote}</span>
              </dt>
              <dd className="text-sm font-bold tabular-nums">
                {numbers.solverMs === null ? copy.solverNone : `${numbers.solverMs} ms`}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="sources-heading" className="flex flex-col gap-3">
          <h2 id="sources-heading" className="text-sm font-bold">
            {copy.sourcesHeading}
          </h2>
          <ul className="flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-sm">
            {copy.sources.map((source) => (
              <li key={source.name} className="flex flex-col">
                <span className="text-sm font-bold">{source.name}</span>
                <a
                  href={source.url}
                  className="min-h-11 text-sm text-ink-muted underline underline-offset-2"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {source.credit}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
