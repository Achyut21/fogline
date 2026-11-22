"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatTile } from "@/components/display/stat-tile";
import { FogFallback } from "@/components/map/fog-fallback";
import type { MapLine, MapStation } from "@/components/map/fog-map";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { squad as s } from "@/copy";
import type { Squad } from "@/server/squad";

/**
 * The squad (F12.2, F12.3): everyone's uncovered cells on one map, with one member's first
 * uncovers tinted on request, the members and the weekly streak. The map is the SVG one, so it
 * reads the same with or without WebGL.
 */
export function SquadView({
  squad,
  lines,
  stations,
}: {
  squad: Squad;
  lines: readonly MapLine[];
  stations: readonly MapStation[];
}) {
  const [who, setWho] = useState("everyone");
  const states = new Map(squad.cells.map((c) => [c.h3, c.state]));
  const byMember = new Map(
    squad.members.map((m) => [m.id, squad.cells.filter((c) => c.by === m.id).map((c) => c.h3)]),
  );
  const options = [
    { value: "everyone", label: s.everyone },
    ...squad.members.map((m) => ({ value: m.id, label: m.name })),
  ];
  const picked = squad.members.find((m) => m.id === who);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center gap-2 px-2 pt-safe">
        <Button variant="ghost" asChild>
          <Link href="/me">
            <ArrowLeft aria-hidden="true" />
            {s.back}
          </Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 pb-safe">
        <h1 className="text-2xl font-extrabold tracking-tight">{s.title}</h1>
        <dl className="grid grid-cols-2 gap-2">
          <StatTile label={s.streakLabel(squad.streak)} value={squad.streak} />
          <StatTile label={s.cells} value={squad.cells.length} accent />
        </dl>
        <SegmentedControl label={s.colorBy} options={options} value={who} onValueChange={setWho} />
        <div className="aspect-square overflow-hidden rounded-lg">
          <FogFallback
            states={states}
            lines={lines}
            stations={stations}
            highlight={picked ? (byMember.get(picked.id) ?? []) : []}
            label={s.mapLabel(squad.cells.length)}
          />
        </div>
        {picked && (
          <p role="status" className="text-sm font-semibold">
            {s.memberCells(picked.name, byMember.get(picked.id)?.length ?? 0)}
          </p>
        )}
        <section aria-labelledby="members" className="flex flex-col gap-2">
          <h2 id="members" className="text-sm font-bold text-ink-muted">
            {s.members}
          </h2>
          <ul className="flex flex-col divide-y divide-rule rounded-lg bg-surface shadow-sm">
            {squad.members.map((m) => (
              <li key={m.id} className="flex min-h-11 items-center justify-between px-4 py-2">
                <span className="font-bold">{m.you ? s.you(m.name) : m.name}</span>
                <span className="text-sm text-ink-muted tabular-nums">
                  {byMember.get(m.id)?.length ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
