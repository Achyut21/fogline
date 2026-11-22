"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { map, plans } from "@/copy";
import { inviteToWeeklyPlan } from "@/server/actions/weekly";
import type { WeeklyPlan } from "@/server/weekly";
import { StopTimeline } from "./crawl-card";

const w = plans.weekly;

/** This week's suggested plans (F10.4), each copied into your own plan to invite friends (F10.5). */
export function WeeklyPlans({ weekly }: { weekly: WeeklyPlan[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [, start] = useTransition();

  function invite(id: string) {
    setBusy(id);
    setFailed(false);
    start(async () => {
      const result = await inviteToWeeklyPlan(id);
      if (result.kind === "created") {
        router.push(`/p/${result.id}?t=${result.inviteToken}`);
        return;
      }
      setFailed(true);
      setBusy(null);
    });
  }

  return (
    <section aria-labelledby="weekly" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="weekly" className="text-sm font-bold text-ink-muted">
          {w.title}
        </h2>
        <p className="text-sm text-ink-muted">{w.body}</p>
      </div>
      {weekly.length === 0 ? (
        <p className="text-sm">{w.empty}</p>
      ) : (
        weekly.map((plan) => (
          <article
            key={plan.id}
            aria-labelledby={`weekly-${plan.id}`}
            className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm"
          >
            <h3 id={`weekly-${plan.id}`} className="text-lg font-extrabold">
              {plan.title}
            </h3>
            <StopTimeline
              stops={plan.stops.map((s, i) => ({
                key: `${s.id}-${i}`,
                name: s.name,
                detail:
                  s.category === "event"
                    ? s.station.name
                    : map.sheet.meta([map.sheet.category[s.category], s.station.name]),
                scheduledAt: s.scheduledAt,
                hours: s.category === "event" ? null : s.hours,
                leg: s.leg,
              }))}
            />
            <Button variant="secondary" disabled={busy !== null} onClick={() => invite(plan.id)}>
              {busy === plan.id ? w.inviting : w.invite}
            </Button>
          </article>
        ))
      )}
      {failed && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {w.failed}
        </p>
      )}
    </section>
  );
}
