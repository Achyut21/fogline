"use client";

import { useState } from "react";
import { FogFallback } from "@/components/map/fog-fallback";
import { FogMap, type RevealAt } from "@/components/map/fog-map";
import { useFogRenderer } from "@/components/map/use-fog-renderer";
import { fog } from "@/copy";
import { nextStops, revealStep, sampleStates, stationPoint } from "./sample-fog";
import { sampleLines, sampleStations } from "./sample-network";

const stations = sampleStations.map((s) => ({ ...s, id: s.name }));
const center = { lat: 42.36, lon: -71.09 };

export function FogSpike({ tierOverride }: { tierOverride: number | null }) {
  const { renderer, tier, failed } = useFogRenderer(tierOverride);
  const [states, setStates] = useState(sampleStates);
  const [step, setStep] = useState(0);
  const [revealAt, setRevealAt] = useState<RevealAt | null>(null);

  function reveal() {
    const name = nextStops[step % nextStops.length];
    const point = stationPoint(name);
    setStates((current) => revealStep(current, "ride", point));
    setStep((s) => s + 1);
    setRevealAt({ point, serial: step });
  }

  return (
    <main className="flex h-dvh flex-col bg-bg">
      <header className="flex flex-col gap-2 border-b border-rule bg-surface px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold">{fog.previewTitle}</h1>
        <p className="text-sm text-ink-muted">{fog.sampleNote}</p>
        <p className="text-sm text-ink-muted" data-testid="renderer">
          {failed
            ? fog.tierFailed
            : renderer && tier !== null
              ? fog.status(fog.rendererName[renderer], tier)
              : fog.checking}
        </p>
        <button
          type="button"
          onClick={reveal}
          disabled={!renderer}
          className="min-h-11 rounded-full bg-accent px-5 font-bold text-accent-ink disabled:opacity-50"
        >
          {fog.reveal}
        </button>
      </header>
      <div className="relative flex-1">
        {renderer === "svg" && (
          <FogFallback states={states} lines={sampleLines} stations={sampleStations} />
        )}
        {renderer && renderer !== "svg" && (
          <FogMap
            renderer={renderer}
            states={states}
            revealAt={revealAt}
            lines={sampleLines}
            stations={stations}
            center={center}
            zoom={12.2}
            label={fog.mapLabel(states.size)}
          />
        )}
      </div>
    </main>
  );
}
