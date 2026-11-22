import { and, asc, eq, isNotNull } from "drizzle-orm";
import { nightAwards } from "@/lib/badges";
import { travelTime } from "@/lib/solver/travel";
import { dayTypeOf, hourBucketOf, toServiceTime } from "@/lib/time";
import { data } from "@/server/data";
import { getDb } from "@/server/db/client";
import {
  badgesAwarded,
  checkins,
  planParticipants,
  planStops,
  plans,
  profiles,
} from "@/server/db/schema";

/**
 * Computes an ended plan's night badges and stores them once each (F8.1, F8.6). Closest Call
 * needs last-train data and the later cron run (D-063), so the prototype awards the rest.
 */
export async function awardNightBadges(planId: string): Promise<number> {
  const db = getDb();
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  if (!plan) return 0;
  const stops = await db
    .select()
    .from(planStops)
    .where(eq(planStops.planId, planId))
    .orderBy(asc(planStops.seq));
  const first = stops.at(0);
  const last = stops.at(-1);
  if (!first || !last) return 0;
  const people = await db
    .select({
      profileId: planParticipants.profileId,
      rsvp: planParticipants.rsvp,
      home: profiles.homeStationId,
    })
    .from(planParticipants)
    .innerJoin(profiles, eq(profiles.id, planParticipants.profileId))
    .where(and(eq(planParticipants.planId, planId), isNotNull(planParticipants.profileId)));
  const joined = people.flatMap((p) => (p.profileId ? [{ ...p, profileId: p.profileId }] : []));
  const members = new Set(joined.map((p) => p.profileId));
  const rows = (await db.select().from(checkins).where(eq(checkins.planId, planId))).filter((c) =>
    members.has(c.profileId),
  );
  const { serviceDate, seconds } = toServiceTime(plan.startsAt);
  const travelSeconds = new Map<string, number>();
  for (const p of joined) {
    const trip = travelTime(
      data.graph(),
      p.home,
      first.stationId,
      dayTypeOf(serviceDate),
      hourBucketOf(seconds),
    );
    if (trip) travelSeconds.set(p.profileId, trip.seconds);
  }
  const awards = nightAwards({
    at: new Date(),
    createdBy: plan.createdBy,
    startsAt: plan.startsAt,
    firstPlaceId: first.placeId,
    lastStopAt: last.scheduledAt,
    participants: joined.map((p) => ({ profileId: p.profileId, rsvp: p.rsvp })),
    checkins: rows.map((c) => ({
      profileId: c.profileId,
      placeId: c.placeId,
      ts: c.ts,
      valid: c.valid,
    })),
    rideEvents: [],
    travelSeconds,
    lastTrains: new Map(),
  });
  if (awards.length === 0) return 0;
  const stored = await db
    .insert(badgesAwarded)
    .values(awards.map((a) => ({ profileId: a.profileId, badgeId: a.badge, planId })))
    .onConflictDoNothing()
    .returning({ id: badgesAwarded.id });
  return stored.length;
}
