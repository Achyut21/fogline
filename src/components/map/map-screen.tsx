"use client";

import dynamic from "next/dynamic";
import { TrainFront } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { LineBadge } from "@/components/display/line-badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { map, ride } from "@/copy";
import type { MapData } from "@/server/map-data";
import { QueryProvider } from "@/components/system/query-provider";
import { StationSheet } from "./station-sheet";

// MapLibre and three.js load in the browser only, after first paint (DESIGN section 9).
const MapPane = dynamic(() => import("./map-pane").then((m) => m.MapPane), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-(--map-land)" />,
});

// The first-reveal card shows once per device. Storage may be blocked (private mode), and then
// the card shows each visit until the first ride clears more fog.
const introKey = "fogline-intro-seen";
const noop = () => () => {};

function introSeen() {
  try {
    return localStorage.getItem(introKey) === "1";
  } catch (e) {
    if (e instanceof DOMException) return false;
    throw e;
  }
}

function rememberIntro() {
  try {
    localStorage.setItem(introKey, "1");
  } catch (e) {
    if (!(e instanceof DOMException)) throw e;
  }
}

const views = [
  { value: "map", label: map.view.map },
  { value: "list", label: map.view.list },
] as const;

// The map home (F2): Boston's uncovered share on top, the fog map or the list view (F2.7)
// below, and the first-reveal card until it is dismissed.
export function MapScreen({ data, homeStation }: { data: MapData; homeStation: string }) {
  const [view, setView] = useState<"map" | "list">("map");
  // Unknown on the server, so neither the card nor the Ride button flashes before hydration.
  const seen = useSyncExternalStore<boolean | null>(noop, introSeen, () => null);
  const [dismissed, setDismissed] = useState(false);
  const intro = data.firstVisit && seen === false && !dismissed;
  const rideButton = seen !== null && !intro;
  const states = useMemo(() => new Map(data.cells), [data.cells]);
  const names = useMemo(() => new Map(data.stations.map((s) => [s.id, s.name])), [data.stations]);
  const [selected, setSelected] = useState<string | null>(null);
  const station = data.stations.find((s) => s.id === selected) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-end justify-between gap-3 bg-surface px-4 pt-safe pb-3 shadow-sm">
        <p className="flex flex-col pt-3">
          <span className="text-3xl font-extrabold tracking-tight tabular-nums">
            {map.uncovered(data.share)}
          </span>
          <span className="text-sm text-ink-muted">{map.uncoveredLabel}</span>
        </p>
        <SegmentedControl
          label={map.view.label}
          options={views}
          value={view}
          onValueChange={setView}
          className="w-44"
        />
      </header>

      {view === "map" ? (
        <div className="relative min-h-0 flex-1">
          <MapPane
            states={states}
            lines={data.lines}
            stations={data.mapStations}
            center={data.home}
            label={map.label(data.share)}
            onStation={setSelected}
          />
          {rideButton && (
            <Button
              asChild
              size="lg"
              className="absolute right-4 bottom-16 z-(--layer-chips) shadow-md"
            >
              <Link href={`/ride?from=${encodeURIComponent(homeStation)}`}>
                <TrainFront aria-hidden="true" />
                {ride.mapButton}
              </Link>
            </Button>
          )}
          {intro && (
            <section
              aria-labelledby="first-reveal"
              className="absolute inset-x-4 bottom-4 z-(--layer-chips) flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-md"
            >
              <h2 id="first-reveal" className="text-xl font-extrabold tracking-tight">
                {map.firstReveal.title}
              </h2>
              <p className="text-ink-muted">{map.firstReveal.body}</p>
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => {
                  setDismissed(true);
                  rememberIntro();
                }}
              >
                {map.firstReveal.dismiss}
              </Button>
            </section>
          )}
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label={map.list.label}
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4"
        >
          <section aria-labelledby="hoods" className="flex flex-col gap-2">
            <h2 id="hoods" className="text-xl font-extrabold tracking-tight">
              {map.list.neighborhoods}
            </h2>
            <p className="text-sm text-ink-muted">{map.list.beyondNote}</p>
            <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface shadow-sm">
              {data.regions.map((r) => (
                <li key={r.id} className="flex min-h-11 items-center justify-between px-4 py-2">
                  <span className="font-bold">{r.name}</span>
                  <span className="text-sm font-bold tabular-nums">{map.uncovered(r.share)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="stations" className="flex flex-col gap-2">
            <h2 id="stations" className="text-xl font-extrabold tracking-tight">
              {map.list.stations}
            </h2>
            <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface shadow-sm">
              {data.stations.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s.id)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{s.name}</span>
                      {s.lines.map((line) => (
                        <LineBadge key={line} line={line} />
                      ))}
                    </span>
                    <span
                      className={
                        s.uncovered ? "text-sm font-bold text-accent" : "text-sm text-ink-muted"
                      }
                    >
                      {s.uncovered ? map.list.uncovered : map.list.fog}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      <QueryProvider>
        <StationSheet station={station} names={names} onClose={() => setSelected(null)} />
      </QueryProvider>
    </div>
  );
}
