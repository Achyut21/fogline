"use client";

import { MotionConfig } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AvatarStack } from "@/components/display/avatar-stack";
import { BadgeChip } from "@/components/display/badge-chip";
import { Countdown } from "@/components/display/countdown";
import { LeaveByChip } from "@/components/display/leave-by-chip";
import { LineBadge, lines } from "@/components/display/line-badge";
import { ParticipantChip } from "@/components/display/participant-chip";
import { StatTile } from "@/components/display/stat-tile";
import { StationDot } from "@/components/display/station-dot";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { design } from "@/copy";

const d = design.display;
const minute = 60_000;

const motionOptions = [
  { value: "on", label: d.motion.on },
  { value: "reduced", label: d.motion.reduced },
] as const;

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-ink-muted">{title}</h3>
      {children}
    </div>
  );
}

export function DisplayDemo() {
  const [motion, setMotion] = useState<"on" | "reduced">("on");
  const [replay, setReplay] = useState(0);
  const [start] = useState(() => Date.now());
  const [skipped, setSkipped] = useState(0);
  const at = (minutes: number) => new Date(start + (minutes - skipped) * minute);

  return (
    <MotionConfig reducedMotion={motion === "reduced" ? "always" : "user"}>
      <div className="flex flex-col gap-8">
        <p className="text-sm text-ink-muted">{design.sampleNote}</p>
        <SegmentedControl
          label={d.motionLabel}
          options={motionOptions}
          value={motion}
          onValueChange={setMotion}
        />

        <Group title={d.lines}>
          <div className="flex flex-wrap items-center gap-2">
            {lines.map((line) => (
              <LineBadge key={line} line={line} />
            ))}
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-2">
              <StationDot /> {d.station}
            </span>
            <span className="flex items-center gap-2">
              <StationDot transfer /> {d.transfer}
            </span>
          </div>
        </Group>

        <Group title={d.stats}>
          <dl key={replay} className="grid grid-cols-3 gap-2">
            <StatTile label={d.statLabels.miles} value={12.1} decimals={1} />
            <StatTile label={d.statLabels.stations} value={46} />
            <StatTile label={d.statLabels.uncovered} value={38} suffix="%" accent />
          </dl>
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => setReplay((n) => n + 1)}
          >
            {d.replay}
          </Button>
        </Group>

        <Group title={d.countdowns}>
          <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
            {[24, 9, 3].map((minutes) => (
              <div key={minutes} className="flex items-center justify-between gap-3">
                <Countdown to={at(minutes)} className="text-3xl font-extrabold tracking-tight" />
                <LeaveByChip at={at(minutes)} />
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => setSkipped((n) => n + 1)}
          >
            {d.skipMinute}
          </Button>
        </Group>

        <Group title={d.badges}>
          <div className="flex flex-wrap gap-2">
            <BadgeChip name={d.badgeNames.firstIn} earned />
            <BadgeChip name={d.badgeNames.nightOwl} earned={false} />
          </div>
        </Group>

        <Group title={d.people}>
          <div className="flex flex-wrap items-center gap-3">
            <AvatarStack names={d.names} />
            <ParticipantChip name={d.names[1]} status={d.status} />
          </div>
        </Group>

        <Group title={d.fog}>
          <ul className="flex flex-wrap gap-2">
            {d.fogTiers.map(({ tier, label }) => (
              <li key={label}>
                <Link
                  href={tier ? `/design/fog?tier=${tier}` : "/design/fog"}
                  className="flex h-11 items-center rounded-full bg-surface-sunken px-4 text-sm font-bold"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </Group>
      </div>
    </MotionConfig>
  );
}
