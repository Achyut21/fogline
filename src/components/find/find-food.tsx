"use client";

import { Camera, Search } from "lucide-react";
import { useActionState, useState } from "react";
import { FogFallback } from "@/components/map/fog-fallback";
import type { MapLine, MapStation } from "@/components/map/fog-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { find, grades, map } from "@/copy";
import { findFromPhoto, tasteOfHome, type FindResult } from "@/server/actions/find";

const gradeOptions = (["any", "B", "A"] as const).map((value) => ({
  value,
  label: grades.minGradeOptions[value],
}));
const budgetOptions = (["any", "1", "2", "3"] as const).map((value) => ({
  value,
  label: value === "any" ? find.filters.any : "$".repeat(Number(value)),
}));
const noCells = new Map();

function Results({
  result,
  lines,
  stations,
}: {
  result: FindResult | null;
  lines: readonly MapLine[];
  stations: readonly MapStation[];
}) {
  if (!result) return null;
  if (result.kind !== "spots") {
    return (
      <p role="alert" className="text-sm font-semibold text-danger">
        {find.errors[result.kind]}
      </p>
    );
  }
  return (
    <section aria-labelledby="found" className="flex flex-col gap-3">
      {result.dish && <p className="font-semibold">{find.dish(result.dish)}</p>}
      <h2 id="found" className="text-lg font-extrabold tracking-tight">
        {find.results}
      </h2>
      {result.spots.length === 0 ? (
        <p role="status" className="text-sm">
          {find.none}
        </p>
      ) : (
        <>
          <div className="aspect-square overflow-hidden rounded-lg">
            <FogFallback
              states={noCells}
              lines={lines}
              stations={stations}
              pins={result.spots}
              label={find.mapLabel(result.spots.length)}
            />
          </div>
          <ul className="flex flex-col gap-3">
            {result.spots.map((spot) => (
              <li key={spot.id} className="flex flex-col gap-1 rounded-lg bg-surface p-4 shadow-sm">
                <span className="font-extrabold">{spot.name}</span>
                <span className="text-sm text-ink-muted">
                  {map.sheet.meta([
                    spot.station,
                    find.walk(spot.walkM),
                    ...(spot.minutes === null ? [] : [find.minutes(spot.minutes)]),
                  ])}
                </span>
                <figure className="flex flex-col gap-1 border-l-2 border-accent pl-3">
                  <blockquote className="text-sm">“{spot.quote}”</blockquote>
                  <figcaption className="text-xs text-ink-muted">{find.review}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Find it (F14.1) and taste of home (F14.2), with grade and budget filters (F14.3). */
export function FindFood({
  lines,
  stations,
}: {
  lines: readonly MapLine[];
  stations: readonly MapStation[];
}) {
  const [grade, setGrade] = useState<(typeof gradeOptions)[number]["value"]>("any");
  const [budget, setBudget] = useState<(typeof budgetOptions)[number]["value"]>("any");
  const [photoResult, photoAction, photoPending] = useActionState(findFromPhoto, null);
  const [homeResult, homeAction, homePending] = useActionState(tasteOfHome, null);
  const filters = (
    <>
      <input type="hidden" name="minGrade" value={grade === "any" ? "" : grade} />
      <input type="hidden" name="budget" value={budget === "any" ? "" : budget} />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SegmentedControl
          label={find.filters.grade}
          options={gradeOptions}
          value={grade}
          onValueChange={setGrade}
        />
        <SegmentedControl
          label={find.filters.budget}
          options={budgetOptions}
          value={budget}
          onValueChange={setBudget}
        />
      </div>

      <form action={photoAction} className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Camera aria-hidden="true" className="size-5 text-accent" />
          {find.photo.title}
        </h2>
        <p className="text-sm text-ink-muted">{find.photo.body}</p>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">{find.photo.label}</span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp,image/heic"
            required
            className="min-h-11 text-base"
          />
        </label>
        <p className="text-xs text-ink-muted">{find.photo.note}</p>
        {filters}
        <Button type="submit" disabled={photoPending}>
          {photoPending ? find.searching : find.photo.submit}
        </Button>
      </form>
      <Results result={photoResult} lines={lines} stations={stations} />

      <form action={homeAction} className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Search aria-hidden="true" className="size-5 text-accent" />
          {find.home.title}
        </h2>
        <p className="text-sm text-ink-muted">{find.home.body}</p>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-bold">{find.home.label}</span>
          <Input
            name="query"
            required
            minLength={2}
            maxLength={60}
            placeholder={find.home.placeholder}
          />
        </label>
        {filters}
        <Button type="submit" disabled={homePending}>
          {homePending ? find.searching : find.home.submit}
        </Button>
      </form>
      <Results result={homeResult} lines={lines} stations={stations} />
    </div>
  );
}
