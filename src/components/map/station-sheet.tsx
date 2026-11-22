"use client";

import { useQuery } from "@tanstack/react-query";
import { TrainFront, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { isLine, LineBadge } from "@/components/display/line-badge";
import { ErrorState } from "@/components/system/error-state";
import { EmptyState } from "@/components/system/empty-state";
import { StaleChip } from "@/components/system/stale-chip";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  sheetSnaps,
} from "@/components/ui/drawer";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { map } from "@/copy";
import { predictionsSchema, type Predictions } from "@/lib/predictions";
import type { MapData } from "@/server/map-data";

type Station = MapData["stations"][number];

const s = map.sheet;

// F3.1: refresh every 30 s; data older than 90 s shows as stale.
const pollMs = 30_000;
const staleMs = 90_000;

const tickMs = 15_000;

/** The clock, moved forward every `everyMs` so minutes and ages count down between fetches. */
function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

async function fetchPredictions(station: string, signal: AbortSignal): Promise<Predictions> {
  const response = await fetch(`/api/mbta/predictions?station=${encodeURIComponent(station)}`, {
    signal,
  });
  if (!response.ok) throw new Error(`predictions answered ${response.status}`);
  return predictionsSchema.parse(await response.json());
}

function Trains({ station, names }: { station: string; names: ReadonlyMap<string, string> }) {
  const query = useQuery({
    queryKey: ["predictions", station],
    queryFn: ({ signal }) => fetchPredictions(station, signal),
    refetchInterval: pollMs,
    // Lets the request reach the service worker's cached answer while offline (ARCHITECTURE 10).
    networkMode: "offlineFirst",
  });
  const offline = query.fetchStatus === "paused";
  const tick = useNow(tickMs);

  if (!query.data) {
    if (offline) return <p className="py-4 text-ink-muted">{s.offline}</p>;
    if (query.isError)
      return (
        <ErrorState
          title={s.error.title}
          body={s.error.body}
          onRetry={() => void query.refetch()}
        />
      );
    return (
      <div aria-busy="true" className="flex flex-col gap-2 py-2">
        <span className="sr-only">{s.loading}</span>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  const now = Math.max(tick, query.dataUpdatedAt);
  const age = now - query.data.updatedAt * 1000;
  const groups = new Map<string, Predictions["departures"]>();
  for (const d of query.data.departures.filter((d) => d.departs * 1000 > now)) {
    const key = s.direction(d.route, d.direction);
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StaleChip minutes={age / 60_000} stale={age > staleMs} />
        {offline && <span className="text-sm text-ink-muted">{s.offline}</span>}
      </div>
      {groups.size === 0 ? (
        <EmptyState icon={TrainFront} title={s.empty.title} body={s.empty.body} />
      ) : (
        [...groups].map(([direction, departures]) => (
          <section key={direction} aria-label={direction} className="flex flex-col gap-1">
            <h4 className="text-sm font-bold text-ink-muted">{direction}</h4>
            <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface-sunken">
              {departures.map((d) => (
                <li
                  key={`${d.route}-${d.direction}-${d.departs}-${d.destination}`}
                  className="flex min-h-11 items-center gap-3 px-3 py-2"
                >
                  {isLine(d.route) && <LineBadge line={d.route} />}
                  <span className="flex-1 font-bold">{names.get(d.destination)}</span>
                  <span className="font-bold tabular-nums">
                    {s.minutes(Math.max(0, Math.floor((d.departs * 1000 - now) / 60_000)))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <p className="text-xs text-ink-muted">{s.credit}</p>
    </div>
  );
}

function StopCard({ card }: { card: NonNullable<Station["card"]> }) {
  if (!card.story) return null;
  return (
    <section aria-labelledby="stop-card" className="flex flex-col gap-2">
      <h3 id="stop-card" className="text-lg font-extrabold tracking-tight">
        {s.card}
      </h3>
      <figure className="flex flex-col gap-2 overflow-hidden rounded-lg bg-surface-sunken">
        {card.image && (
          <div className="relative aspect-video w-full">
            <Image src={card.image.url} alt="" fill unoptimized className="object-cover" />
          </div>
        )}
        <figcaption className="flex flex-col gap-1 px-3 pb-3">
          <p>{card.story.fact}</p>
          <a href={card.story.url} className="text-sm text-ink-muted underline">
            {s.source(card.story.title)}
          </a>
          {card.image && (
            <a href={card.image.page} className="text-xs text-ink-muted underline">
              {s.photo(card.image.author, card.image.license)}
            </a>
          )}
        </figcaption>
      </figure>
    </section>
  );
}

function Spots({ spots }: { spots: Station["spots"] }) {
  return (
    <section aria-labelledby="nearby" className="flex flex-col gap-2">
      <h3 id="nearby" className="text-lg font-extrabold tracking-tight">
        {s.nearby}
      </h3>
      {spots.length === 0 ? (
        <p className="text-ink-muted">{s.noSpots}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface-sunken">
          {spots.map((spot) => (
            <li key={spot.id} className="flex min-h-11 flex-col justify-center px-3 py-2">
              <span className="font-bold">{spot.name}</span>
              <span className="text-sm text-ink-muted">
                {[
                  s.category[spot.category],
                  s.walk(spot.walkM),
                  spot.grade ? s.grade(spot.grade) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The station sheet (F2.5): live departures, the stop card once uncovered, and nearby spots. */
export function StationSheet({
  station,
  names,
  onClose,
}: {
  station: Station | null;
  names: ReadonlyMap<string, string>;
  onClose: () => void;
}) {
  const [snap, setSnap] = useState<number | string | null>(sheetSnaps[1]);
  // The last station stays rendered while the sheet slides away, and each open starts halfway.
  const [shown, setShown] = useState<Station | null>(null);
  if (station && station !== shown) {
    setShown(station);
    setSnap(sheetSnaps[1]);
  }
  const view = station ?? shown;
  return (
    <Drawer
      open={station !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      snapPoints={sheetSnaps}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      fadeFromIndex={1}
    >
      {view && (
        <DrawerContent>
          <DrawerHeader className="flex-row items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <DrawerTitle>{view.name}</DrawerTitle>
              <DrawerDescription className="flex flex-wrap items-center gap-2">
                {view.lines.map((line) => (
                  <LineBadge key={line} line={line} />
                ))}
                <span>
                  {view.home ? s.home : view.minutes !== null && s.fromHome(view.minutes)}
                </span>
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <IconButton label={s.close} icon={X} />
            </DrawerClose>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
            <section aria-labelledby="trains" className="flex flex-col gap-2">
              <h3 id="trains" className="text-lg font-extrabold tracking-tight">
                {s.trains}
              </h3>
              <Trains station={view.id} names={names} />
            </section>
            {view.card && <StopCard card={view.card} />}
            <Spots spots={view.spots} />
          </div>
        </DrawerContent>
      )}
    </Drawer>
  );
}
