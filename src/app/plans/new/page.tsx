import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isLine } from "@/components/display/line-badge";
import { PlanBuilder } from "@/components/plans/plan-builder";
import { plans } from "@/copy";
import { calendarDateOf, serviceDateOf, serviceTimeToDate } from "@/lib/time";
import { currentProfile } from "@/server/profile";
import { stationById, stations } from "@/server/stations";

export const metadata: Metadata = { title: plans.builder.pageTitle };

// Start times in New York, 5:00 PM to 1:00 AM by half hours, from the service day still running
// (after midnight) and today's, skipping ones already past.
const firstSlot = 17 * 3600;
const lastSlot = 25 * 3600;
const step = 1800;

function startTimes(now: Date) {
  const times = new Set<string>();
  for (const day of [serviceDateOf(now), calendarDateOf(now)]) {
    for (let s = firstSlot; s <= lastSlot; s += step) {
      const at = serviceTimeToDate(day, s);
      if (at.getTime() > now.getTime()) times.add(at.toISOString());
    }
  }
  return [...times];
}

const stationChoices = [...stations]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((s) => ({ id: s.id, name: s.name, lines: s.routes.filter(isLine) }));

export default async function NewPlanPage() {
  const profile = await currentProfile();
  if (!profile) redirect("/welcome");
  const home = stationById(profile.homeStationId);
  if (!home) redirect("/");
  return (
    <PlanBuilder
      you={{ name: profile.displayName, station: home.id, stationName: home.name }}
      under21={profile.ageBand !== "21plus"}
      stations={stationChoices}
      times={startTimes(new Date())}
    />
  );
}
