import { and, asc, eq } from "drizzle-orm";
import { reminder as copy } from "@/copy";
import { calendarFile } from "@/lib/ics";
import { leaveByFor } from "@/lib/lasttrain/leave-by";
import { data } from "@/server/data";
import type { Db } from "@/server/db/client";
import { planParticipants, planStops, plans, profiles } from "@/server/db/schema";
import { stopSpot } from "@/server/stop-spot";

export const alarmMinutes = [20, 5] as const;

export type Reminder =
  | { kind: "ics"; body: string }
  | { kind: "not-found" }
  | { kind: "ended" }
  /** No train to catch: home is a walk away, no train runs that night, or the date isn't known. */
  | { kind: "no-train" };

/**
 * A participant's "Remind me" calendar file (F5.8): their leave-by from the plan's last stop
 * (F5.5), with alarms 20 and 5 minutes before. Only a joined participant gets one, since it
 * gives away their home station's last train (F4.8, F5.1).
 */
export async function reminderFor(
  db: Db,
  planId: string,
  profileId: string,
  now: Date,
): Promise<Reminder> {
  const [row] = await db
    .select({
      title: plans.title,
      status: plans.status,
      startsAt: plans.startsAt,
      home: profiles.homeStationId,
    })
    .from(plans)
    .innerJoin(
      planParticipants,
      and(eq(planParticipants.planId, plans.id), eq(planParticipants.profileId, profileId)),
    )
    .innerJoin(profiles, eq(profiles.id, planParticipants.profileId))
    .where(eq(plans.id, planId));
  if (!row) return { kind: "not-found" };
  if (row.status === "ended") return { kind: "ended" };
  const stops = await db
    .select()
    .from(planStops)
    .where(eq(planStops.planId, planId))
    .orderBy(asc(planStops.seq));
  const route = stops.flatMap((s) => {
    const spot = stopSpot(s.placeId, s.stationId);
    return spot ? [{ stop: s, spot }] : [];
  });
  const last = route.at(-1);
  const home = data.stations().find((s) => s.id === row.home);
  if (!last || !home) return { kind: "not-found" };
  const leaveBy = leaveByFor(
    data.timetable(),
    last.stop.scheduledAt,
    route.map(({ stop, spot }) => ({ station: stop.stationId, at: spot, walkM: spot.walkM ?? 0 })),
    { station: home.id, at: home },
  );
  if (leaveBy.kind !== "train") return { kind: "no-train" };
  const station = data.stations().find((s) => s.id === last.stop.stationId);
  return {
    kind: "ics",
    body: calendarFile(
      {
        uid: `${planId}.${profileId}@fogline`,
        start: leaveBy.leaveBy,
        minutes: 5,
        summary: copy.summary(leaveBy.leaveBy),
        description: copy.description(
          row.title,
          station?.name ?? last.stop.stationId,
          leaveBy.departs,
        ),
        alarms: alarmMinutes.map((m) => ({ minutesBefore: m, text: copy.alarm(m) })),
      },
      now,
    ),
  };
}
