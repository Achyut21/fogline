"use client";

import { Footprints, TrainFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { map, plans } from "@/copy";
import { clock } from "@/copy/plans";
import type { CrawlLeg } from "@/lib/crawl";
import type { OpenState } from "@/lib/places/hours";
import type { LeaveBy } from "@/lib/lasttrain/leave-by";
import type { CrawlOption } from "@/server/crawl";
import { LeaveByLine } from "./option-card";

const b = plans.builder;

function Leg({ leg }: { leg: CrawlLeg }) {
  const Icon = leg.mode === "walk" ? Footprints : TrainFront;
  return (
    <p className="flex items-center gap-2 pl-24 text-sm text-ink-muted">
      <Icon aria-hidden="true" className="size-4" />
      {b.crawl.leg(leg.mode, leg.minutes)}
    </p>
  );
}

function Hours({ state }: { state: OpenState }) {
  if (state === "open") return null;
  return (
    <span className={state === "closed" ? "text-sm text-danger" : "text-sm text-ink-muted"}>
      {b.crawl.hours[state]}
    </span>
  );
}

export type TimelineStop = {
  key: string;
  name: string;
  detail: string;
  scheduledAt: string;
  hours: OpenState | null;
  leg: CrawlLeg | null;
};

/** Stops in order with their times, open hours and the walk or ride between them (F10.1). */
export function StopTimeline({ stops }: { stops: readonly TimelineStop[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {stops.map((stop) => (
        <li key={stop.key} className="flex flex-col gap-2">
          {stop.leg && <Leg leg={stop.leg} />}
          <div className="flex items-baseline gap-3">
            <span className="w-20 shrink-0 text-sm font-bold tabular-nums">
              {clock(new Date(stop.scheduledAt))}
            </span>
            <span className="flex flex-col">
              <span className="font-extrabold">{stop.name}</span>
              <span className="text-sm text-ink-muted">{stop.detail}</span>
              {stop.hours && <Hours state={stop.hours} />}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Everyone's minutes to the first stop and leave-by home from the last (F10.3). */
export function PeopleLines({
  people,
}: {
  people: readonly { name: string; minutes: number; leaveBy: LeaveBy }[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {people.map((p) => (
        <li key={p.name} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-bold">{p.name}</span>
            <span className="tabular-nums">{b.crawl.toFirst(p.minutes)}</span>
          </div>
          <LeaveByLine name={p.name} leaveBy={p.leaveBy} />
        </li>
      ))}
    </ul>
  );
}

/** One crawl option (F10.1–F10.3). */
export function CrawlCard({
  n,
  crawl,
  creating,
  onChoose,
}: {
  n: number;
  crawl: CrawlOption;
  creating: boolean;
  onChoose: () => void;
}) {
  const headingId = `crawl-${n}`;
  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-lg bg-surface p-4 shadow-sm"
    >
      <header className="flex flex-col gap-1">
        <p className="text-xs font-bold text-ink-muted">{b.option(n)}</p>
        <h3 id={headingId} className="text-lg font-extrabold">
          {b.crawl.title(crawl.stops.map((s) => s.name))}
        </h3>
      </header>
      <StopTimeline
        stops={crawl.stops.map((s, i) => ({
          key: `${s.id}-${i}`,
          name: s.name,
          detail: map.sheet.meta([map.sheet.category[s.category], s.station.name]),
          scheduledAt: s.scheduledAt,
          hours: s.hours,
          leg: s.leg,
        }))}
      />
      <PeopleLines people={crawl.people} />
      <Button disabled={creating} onClick={onChoose}>
        {creating ? b.creating : b.choose}
      </Button>
    </article>
  );
}
