"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { readForce2d, subscribeForce2d, writeForce2d } from "@/components/map/map-preference";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { me } from "@/copy";
import { deleteMyData, updateAgeBand } from "@/server/actions/profile";

const s = me.settings;
const mapOptions = (["auto", "flat"] as const).map((value) => ({
  value,
  label: s.mapOptions[value],
}));
const ageOptions = (["under21", "21plus"] as const).map((value) => ({
  value,
  label: s.ageOptions[value],
}));
type AgeBand = (typeof ageOptions)[number]["value"];

/** Settings (DESIGN section 6, Me): theme, the 2D map, age band, and delete my data (F1.7). */
export function SettingsForm({ ageBand }: { ageBand: AgeBand }) {
  const force2d = useSyncExternalStore(subscribeForce2d, readForce2d, () => null);
  const [age, setAge] = useState<AgeBand>(ageBand);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="theme" className="flex flex-col gap-2">
        <h2 id="theme" className="text-sm font-bold text-ink-muted">
          {s.theme}
        </h2>
        <ThemeToggle />
      </section>

      <section aria-labelledby="map" className="flex flex-col gap-2">
        <h2 id="map" className="text-sm font-bold text-ink-muted">
          {s.map}
        </h2>
        <SegmentedControl
          label={s.map}
          options={mapOptions}
          value={force2d === null ? "" : force2d ? "flat" : "auto"}
          onValueChange={(value) => writeForce2d(value === "flat")}
        />
        <p className="text-sm text-ink-muted">{s.mapHelp}</p>
      </section>

      <section aria-labelledby="age" className="flex flex-col gap-2">
        <h2 id="age" className="text-sm font-bold text-ink-muted">
          {s.age}
        </h2>
        <SegmentedControl
          label={s.age}
          options={ageOptions}
          value={age}
          onValueChange={(value) => {
            setAge(value);
            setSaved(false);
            startSaving(async () => {
              const result = await updateAgeBand(value);
              setSaved(result.kind === "saved");
            });
          }}
        />
        <p className="text-sm text-ink-muted">{s.ageHelp}</p>
        {saved && !saving && (
          <p role="status" className="text-sm font-semibold">
            {s.ageSaved}
          </p>
        )}
      </section>

      <section aria-labelledby="delete" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 id="delete" className="text-lg font-extrabold">
          {s.delete.title}
        </h2>
        <p className="text-sm text-ink-muted">{s.delete.body}</p>
        {confirming ? (
          <div className="flex flex-col gap-2">
            <Button
              variant="danger"
              disabled={deleting}
              onClick={() => startDeleting(async () => void (await deleteMyData()))}
            >
              {deleting ? s.delete.deleting : s.delete.confirm}
            </Button>
            <Button variant="secondary" disabled={deleting} onClick={() => setConfirming(false)}>
              {s.delete.cancel}
            </Button>
          </div>
        ) : (
          <Button variant="danger" className="self-start" onClick={() => setConfirming(true)}>
            {s.delete.start}
          </Button>
        )}
      </section>
    </div>
  );
}
