"use client";

import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Line } from "@/components/display/line-badge";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { grades, map, plans } from "@/copy";
import {
  adultCategories,
  gradedCategories,
  placeCategories,
  type PlaceCategory,
} from "@/lib/places/types";
import { createPlan } from "@/server/actions/plans";
import { findMeetup } from "@/server/actions/core-loop";
import type { MeetupResult } from "@/server/meetup";
import { OptionCard } from "./option-card";

const b = plans.builder;
type MinGrade = "any" | "B" | "A";
const gradeOptions = (["any", "B", "A"] as const).map((value) => ({
  value,
  label: grades.minGradeOptions[value],
}));
const maxFriends = 7;
const selectClass =
  "h-12 w-full rounded-md border border-field-border bg-field px-4 text-base font-semibold text-ink";

type Friend = { key: number; name: string; station: string };
type StationChoice = { id: string; name: string; lines: Line[] };

/**
 * The plan builder (F4.1, F4.3–F4.6, F5.2, F5.3): you and named friends with their stations, a
 * start time and kinds of spot; the fairest stations with everyone's minutes and leave-by times;
 * one spot becomes the plan and its invite link.
 */
export function PlanBuilder({
  you,
  under21,
  stations,
  times,
}: {
  you: { name: string; station: string; stationName: string };
  under21: boolean;
  stations: StationChoice[];
  times: string[];
}) {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([{ key: 0, name: "", station: "" }]);
  const [startsAt, setStartsAt] = useState(times[0] ?? "");
  const [kinds, setKinds] = useState<ReadonlySet<PlaceCategory>>(new Set(["food"]));
  const [minGrade, setMinGrade] = useState<MinGrade>("any");
  const [result, setResult] = useState<MeetupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finding, startFinding] = useTransition();
  const [creating, startCreating] = useTransition();

  const chips = placeCategories
    .filter((c) => !(under21 && adultCategories.includes(c)))
    .map((value) => ({ value, label: map.sheet.category[value] }));

  function update(key: number, change: Partial<Friend>) {
    setFriends((list) => list.map((f) => (f.key === key ? { ...f, ...change } : f)));
    setResult(null);
  }

  function toggle(kind: PlaceCategory) {
    setKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
    setResult(null);
  }

  function find(categories: readonly PlaceCategory[], grade: MinGrade = minGrade) {
    if (friends.some((f) => !f.name.trim() || !f.station)) {
      setError(b.needName);
      return;
    }
    setError(null);
    startFinding(async () => {
      try {
        setResult(
          await findMeetup({
            people: [
              { name: you.name, station: you.station },
              ...friends.map((f) => ({ name: f.name.trim(), station: f.station })),
            ],
            startsAt,
            categories,
            budget: null,
            minGrade: grade === "any" ? null : grade,
          }),
        );
      } catch (e) {
        if (!(e instanceof Error)) throw e;
        setError(b.errors.failed);
      }
    });
  }

  function choose(stationId: string, stationName: string, placeId: string) {
    startCreating(async () => {
      try {
        const created = await createPlan({
          title: b.planTitle(stationName),
          startsAt,
          friends: friends.map((f) => ({ name: f.name.trim(), station: f.station })),
          stop: { placeId, stationId },
        });
        if (created.kind === "created") {
          router.push(`/p/${created.id}?t=${created.inviteToken}`);
          return;
        }
        setError(
          created.kind === "no-profile"
            ? b.errors.noProfile
            : created.kind === "adults-only"
              ? b.errors.adultsOnly
              : b.errors.unknownSpot,
        );
      } catch (e) {
        if (!(e instanceof Error)) throw e;
        setError(b.errors.failed);
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center gap-2 px-2 pt-safe">
        <Button variant="ghost" asChild>
          <Link href="/plans">
            <ArrowLeft aria-hidden="true" />
            {b.back}
          </Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-6 px-4 pb-safe">
        <h1 className="text-2xl font-extrabold tracking-tight">{b.title}</h1>

        <section aria-labelledby="friends" className="flex flex-col gap-3">
          <h2 id="friends" className="text-sm font-bold text-ink-muted">
            {b.friends}
          </h2>
          <p className="rounded-md bg-surface-sunken px-4 py-3 font-semibold">
            {b.you(you.name)} · {you.stationName}
          </p>
          {friends.map((f, i) => (
            <fieldset key={f.key} className="flex flex-col gap-2 rounded-lg bg-surface p-3">
              <legend className="sr-only">{`${b.friends} ${i + 1}`}</legend>
              <div className="flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-bold">{b.friendName}</span>
                  <Input
                    value={f.name}
                    maxLength={40}
                    autoComplete="off"
                    onChange={(e) => update(f.key, { name: e.target.value })}
                  />
                </label>
                {friends.length > 1 && (
                  <IconButton
                    label={b.removeFriend(f.name)}
                    icon={X}
                    onClick={() => {
                      setFriends((list) => list.filter((x) => x.key !== f.key));
                      setResult(null);
                    }}
                  />
                )}
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-bold">{b.friendStation}</span>
                <select
                  value={f.station}
                  onChange={(e) => update(f.key, { station: e.target.value })}
                  className={selectClass}
                >
                  <option value="">{b.pickStation}</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          ))}
          {friends.length < maxFriends && (
            <Button
              variant="secondary"
              className="self-start"
              onClick={() =>
                setFriends((list) => [
                  ...list,
                  { key: Math.max(...list.map((x) => x.key)) + 1, name: "", station: "" },
                ])
              }
            >
              <Plus aria-hidden="true" />
              {b.addFriend}
            </Button>
          )}
        </section>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-ink-muted">{b.time}</span>
          <select
            value={startsAt}
            onChange={(e) => {
              setStartsAt(e.target.value);
              setResult(null);
            }}
            className={selectClass}
          >
            {times.map((t) => (
              <option key={t} value={t}>
                {b.timeOption(new Date(t))}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-ink-muted">{b.what}</span>
          <FilterChips label={b.what} chips={chips} selected={kinds} onToggle={toggle} />
        </div>

        {[...kinds].some((k) => gradedCategories.includes(k)) && (
          <SegmentedControl
            label={grades.minGrade}
            options={gradeOptions}
            value={minGrade}
            onValueChange={(value) => {
              setMinGrade(value);
              setResult(null);
            }}
          />
        )}

        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        <Button
          size="lg"
          disabled={finding || kinds.size === 0 || !startsAt}
          onClick={() => find([...kinds])}
        >
          {finding ? b.finding : b.find}
        </Button>

        {result?.kind === "options" && (
          <section aria-labelledby="options" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="options" className="text-lg font-extrabold tracking-tight">
                {b.options}
              </h2>
              <p className="text-sm text-ink-muted">{b.optionNote}</p>
            </div>
            {result.options.map((option, i) => (
              <OptionCard
                key={option.station.id}
                n={i + 1}
                option={option}
                lines={stations.find((s) => s.id === option.station.id)?.lines ?? []}
                creating={creating}
                onChoose={(placeId) => choose(option.station.id, option.station.name, placeId)}
              />
            ))}
          </section>
        )}

        {result?.kind === "none" && (
          <section role="status" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
            <h2 className="text-lg font-extrabold tracking-tight">{b.none.title}</h2>
            <p className="text-sm text-ink-muted">{b.none.body}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {result.blockedBy.map((blocker) => (
                <li key={blocker}>{b.none.blocker[blocker]}</li>
              ))}
            </ul>
            {result.blockedBy.includes("minGrade") && (
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => {
                  setMinGrade("any");
                  find([...kinds], "any");
                }}
              >
                {b.none.relaxGrade}
              </Button>
            )}
            {result.blockedBy.includes("categories") && (
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => {
                  const all = chips.map((c) => c.value);
                  setKinds(new Set(all));
                  find(all);
                }}
              >
                {b.none.relax}
              </Button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
