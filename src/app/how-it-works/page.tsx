import type { Metadata } from "next";
import { BottomNav } from "@/components/app/bottom-nav";
import { StatTile } from "@/components/display/stat-tile";
import { ErrorState } from "@/components/system/error-state";
import { StaleChip } from "@/components/system/stale-chip";
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

// COPY.md joins a time and its AM or PM with a no-break space. Intl puts a narrow one there.
function clockDate(at: Date) {
  return recordedAt.format(at).replace(/\s(?=[AP]M)/u, " ");
}

const staleAfterMinutes = 2;
const tables = ["vehicle_positions", "checkins", "ride_events", "noise_readings"] as const;

// F15.1: live numbers from the hypertables, cached for at most 60 s (F15.2), and every data
// source with its credit. When the database can't be read, the last numbers show with their age,
// or an error with nothing yet; the sources list is static and always shows.
export default async function HowItWorksPage() {
  const live = await cachedHowItWorks(getDb());
  const minutesOld = live?.minutesOld ?? 0;
  const quiet =
    live !== null &&
    live.numbers.rows.checkins +
      live.numbers.rows.ride_events +
      live.numbers.rows.noise_readings ===
      0;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col gap-6 px-4 pt-safe pb-6">
        <header className="flex flex-col gap-2 pt-4">
          <h1 className="text-2xl font-extrabold tracking-tight">{copy.title}</h1>
          <p className="text-sm text-ink-muted">{copy.intro}</p>
        </header>

        <section aria-labelledby="live-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="live-heading" className="text-xl font-extrabold tracking-tight">
              {copy.liveHeading}
            </h2>
            {live && <StaleChip minutes={minutesOld} stale={minutesOld >= staleAfterMinutes} />}
          </div>
          {live === null ? (
            <ErrorState title={copy.liveError.title} body={copy.liveError.body} />
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2">
                {tables.map((table) => (
                  <StatTile key={table} label={copy.rows[table]} value={live.numbers.rows[table]} />
                ))}
              </dl>
              {quiet && <p className="text-sm text-ink-muted">{copy.quiet}</p>}
              <dl className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-sm text-ink-muted">{copy.compression}</dt>
                  <dd className="text-sm font-bold tabular-nums">
                    {live.numbers.compressionRatio === null
                      ? copy.compressionNone
                      : copy.ratio(live.numbers.compressionRatio)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-sm text-ink-muted">{copy.lastRun}</dt>
                  <dd className="text-sm font-bold tabular-nums">
                    {live.numbers.lastRecorderRun === null
                      ? copy.lastRunNone
                      : clockDate(live.numbers.lastRecorderRun)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-sm text-ink-muted">
                    {copy.solver}
                    <span className="block">{copy.solverNote}</span>
                  </dt>
                  <dd className="text-sm font-bold tabular-nums">
                    {live.numbers.solverMs === null
                      ? copy.solverNone
                      : copy.milliseconds(live.numbers.solverMs)}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>

        <section aria-labelledby="sources-heading" className="flex flex-col gap-3">
          <h2 id="sources-heading" className="text-xl font-extrabold tracking-tight">
            {copy.sourcesHeading}
          </h2>
          <ul className="flex flex-col gap-1 rounded-lg bg-surface p-4 shadow-sm">
            {copy.sources.map((source) => (
              <li key={source.name} className="flex flex-col">
                <span className="text-sm font-bold">{source.name}</span>
                <a
                  href={source.url}
                  className="inline-flex min-h-11 items-center text-sm text-ink-muted underline underline-offset-2"
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
