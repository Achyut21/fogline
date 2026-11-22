"use client";

import { useState, useTransition } from "react";
import { grades } from "@/copy";
import { spotInspection } from "@/server/actions/inspection";

type Inspection = NonNullable<Awaited<ReturnType<typeof spotInspection>>>;

/** The cited violations of a spot's latest inspection, loaded when opened (F11.2). */
export function InspectionDetails({ spotId }: { spotId: string }) {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  function load(open: boolean) {
    if (!open || inspection || pending) return;
    setFailed(false);
    start(async () => {
      try {
        setInspection(await spotInspection(spotId));
      } catch (e) {
        if (!(e instanceof Error)) throw e;
        setFailed(true);
      }
    });
  }

  return (
    <details onToggle={(e) => load(e.currentTarget.open)} className="text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-accent">
        {grades.details}
      </summary>
      {pending && <p className="text-ink-muted">{grades.loading}</p>}
      {failed && <p className="text-danger">{grades.failed}</p>}
      {inspection && (
        <div className="flex flex-col gap-2 pb-2">
          <p className="font-semibold">
            {inspection.violations.length === 0
              ? grades.none
              : grades.violations(inspection.violations.length)}
          </p>
          <ul className="flex flex-col gap-1">
            {inspection.violations.map((v, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-bold">{grades.level[v.level]}</span>
                <span>{v.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
