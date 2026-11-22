import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { autoEndAt } from "@/lib/plan-end";
import { awardNightBadges } from "@/server/badges";
import type { Db } from "@/server/db/client";
import { checkins, planStops, plans } from "@/server/db/schema";

/**
 * Ends every open plan whose automatic end has passed (F6.4) and awards its night badges (F8.1).
 * A plan's `ended_at` is the rule's time, not the cron's, so the check-in window and the recap
 * cover exactly the night. Returns the IDs it ended.
 */
export async function endDuePlans(db: Db, now: Date): Promise<string[]> {
  const open = await db.select({ id: plans.id }).from(plans).where(ne(plans.status, "ended"));
  if (open.length === 0) return [];
  const ids = open.map((p) => p.id);
  const stops = await db
    .select({
      planId: planStops.planId,
      placeId: planStops.placeId,
      scheduledAt: planStops.scheduledAt,
    })
    .from(planStops)
    .where(inArray(planStops.planId, ids))
    .orderBy(desc(planStops.seq));
  const lastStops = new Map<string, { placeId: string; scheduledAt: Date }>();
  for (const stop of stops) if (!lastStops.has(stop.planId)) lastStops.set(stop.planId, stop);

  const latest = await db
    .select({
      planId: checkins.planId,
      placeId: checkins.placeId,
      at: sql<Date>`max(${checkins.ts})`.mapWith((v: string | Date) => new Date(v)),
    })
    .from(checkins)
    .where(and(inArray(checkins.planId, ids), eq(checkins.valid, true)))
    .groupBy(checkins.planId, checkins.placeId);

  const ended: string[] = [];
  for (const [planId, last] of lastStops) {
    const checkedIn = latest.find((c) => c.planId === planId && c.placeId === last.placeId);
    const endsAt = autoEndAt(last.scheduledAt, checkedIn?.at ?? null);
    if (endsAt > now) continue;
    const done = await db
      .update(plans)
      .set({ status: "ended", endedAt: endsAt })
      .where(and(eq(plans.id, planId), ne(plans.status, "ended")))
      .returning({ id: plans.id });
    if (done.length === 0) continue;
    await awardNightBadges(planId, db);
    ended.push(planId);
  }
  return ended;
}
