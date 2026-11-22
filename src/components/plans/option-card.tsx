"use client";

import { useState } from "react";
import { GradeBadge } from "@/components/display/grade-badge";
import { LeaveByChip } from "@/components/display/leave-by-chip";
import { LineBadge, type Line } from "@/components/display/line-badge";
import { Button } from "@/components/ui/button";
import { legal, map, plans } from "@/copy";
import { gradedCategories } from "@/lib/places/types";
import type { LeaveBy } from "@/lib/lasttrain/leave-by";
import type { MeetupOption } from "@/server/meetup";

const b = plans.builder;

/** What a person's ride home looks like: a leave-by time, a warning, or nothing to show. */
export function LeaveByLine({ name, leaveBy }: { name: string; leaveBy: LeaveBy }) {
  if (leaveBy.kind === "train") {
    return leaveBy.startsAfterLeaveBy ? (
      <p className="text-sm font-semibold text-danger">{b.noTrain(name, leaveBy.leaveBy)}</p>
    ) : (
      <LeaveByChip at={leaveBy.leaveBy} className="self-start" />
    );
  }
  if (leaveBy.kind === "no-train") {
    return (
      <p className="text-sm font-semibold text-danger">
        {b.noTrainAtAll(name, leaveBy.walkHomeMinutes)}
      </p>
    );
  }
  if (leaveBy.kind === "no-timetable") {
    return <p className="text-sm text-ink-muted">{b.noTimetable}</p>;
  }
  return null;
}

/**
 * One fair option (F4.4): the station, each person's minutes as a bar against the longest ride,
 * their leave-by time (F5.2, F5.3), and the spots near the station to pick from.
 */
export function OptionCard({
  n,
  option,
  lines,
  creating,
  onChoose,
}: {
  n: number;
  option: MeetupOption;
  lines: readonly Line[];
  creating: boolean;
  onChoose: (placeId: string) => void;
}) {
  const [spot, setSpot] = useState(option.spots[0]?.id ?? "");
  const longest = Math.max(1, ...option.people.map((p) => p.minutes));
  const headingId = `option-${option.station.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-lg bg-surface p-4 shadow-sm"
    >
      <header className="flex flex-col gap-1">
        <p className="text-xs font-bold text-ink-muted">{b.option(n)}</p>
        <h3 id={headingId} className="flex flex-wrap items-center gap-2 text-lg font-extrabold">
          {option.station.name}
          {lines.map((line) => (
            <LineBadge key={line} line={line} />
          ))}
        </h3>
        <p className="text-sm text-ink-muted">{b.maxRide(longest)}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {option.people.map((p) => (
          <li key={p.name} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-bold">{p.name}</span>
              <span className="tabular-nums">{b.personMinutes(p.minutes, p.transfers)}</span>
            </div>
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(4, (p.minutes / longest) * 100)}%` }}
              />
            </div>
            <LeaveByLine name={p.name} leaveBy={p.leaveBy} />
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-sm font-bold text-ink-muted">{b.spots}</legend>
        {option.spots.map((s) => (
          <label
            key={s.id}
            className="flex min-h-11 items-center gap-3 rounded-md bg-surface-sunken px-3 py-2 has-checked:ring-2 has-checked:ring-accent"
          >
            <input
              type="radio"
              name={headingId}
              value={s.id}
              checked={spot === s.id}
              onChange={() => setSpot(s.id)}
              className="size-5 accent-(--accent)"
            />
            <span className="flex flex-1 flex-col">
              <span className="font-semibold">{s.name}</span>
              <span className="text-sm text-ink-muted">
                {map.sheet.meta([map.sheet.category[s.category], b.walk(s.walkM)])}
              </span>
              {gradedCategories.includes(s.category) && (
                <GradeBadge letter={s.grade} inspected={s.inspected} />
              )}
            </span>
          </label>
        ))}
      </fieldset>

      {option.spots.some((s) => s.grade) && <p className="text-xs text-ink-muted">{legal.grade}</p>}

      <Button disabled={creating || !spot} onClick={() => onChoose(spot)}>
        {creating ? b.creating : b.choose}
      </Button>
    </article>
  );
}
