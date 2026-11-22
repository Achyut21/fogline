import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Measure } from "@/components/calm/measure";
import { isLine, LineBadge } from "@/components/display/line-badge";
import { Button } from "@/components/ui/button";
import { calm } from "@/copy";
import { loudnessOf } from "@/lib/noise";
import { getDb } from "@/server/db/client";
import { measuredSegments, nextStops } from "@/server/noise";
import { currentProfile } from "@/server/profile";
import { stationById, stations } from "@/server/stations";

export const metadata: Metadata = { title: calm.pageTitle };

const choices = [...stations]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((s) => ({ id: s.id, name: s.name }));
const next = Object.fromEntries(stations.map((s) => [s.id, nextStops(s.id)]));
const nameOf = (id: string) => stationById(id)?.name ?? id;

/** Calm mode (F13.1, F13.3): measure a stretch, and the stretches riders measured. */
export default async function CalmPage() {
  if (!(await currentProfile())) redirect("/welcome");
  const segments = await measuredSegments(getDb());
  const levels = segments.map((s) => s.db);
  const ranked = [...segments].sort((a, b) => a.db - b.db);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center gap-2 px-2 pt-safe">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            {calm.pageTitle}
          </Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-6 px-4 pb-safe">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">{calm.title}</h1>
          <p className="text-ink-muted">{calm.intro}</p>
        </div>
        <Measure stations={choices} next={next} />
        <section aria-labelledby="measured" className="flex flex-col gap-2">
          <h2 id="measured" className="text-lg font-extrabold tracking-tight">
            {calm.measured.title}
          </h2>
          <p className="text-sm text-ink-muted">{calm.measured.note}</p>
          {ranked.length === 0 ? (
            <p className="text-sm">{calm.measured.empty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface shadow-sm">
              {ranked.map((s) => {
                const loudness = loudnessOf(s.db, levels);
                return (
                  <li
                    key={`${s.route}:${s.from}:${s.to}`}
                    data-loudness={loudness}
                    className="flex min-h-11 items-center justify-between gap-3 px-4 py-2"
                  >
                    <span className="flex flex-col">
                      <span className="flex items-center gap-2 font-semibold">
                        {isLine(s.route) && <LineBadge line={s.route} />}
                        {calm.measured.segment(nameOf(s.from), nameOf(s.to))}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {calm.measured.readings(s.readings)}
                      </span>
                    </span>
                    <span
                      className={
                        loudness === "quieter"
                          ? "rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink"
                          : loudness === "louder"
                            ? "rounded-full border-2 border-ink px-3 py-1 text-xs font-bold"
                            : "rounded-full bg-surface-sunken px-3 py-1 text-xs font-bold"
                      }
                    >
                      {calm.loudness[loudness]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
