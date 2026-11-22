"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { checkInValidity, type CheckinResult } from "@/lib/checkin";
import { revealAround } from "@/lib/geo/cells";
import { awardNightBadges } from "@/server/badges";
import { data } from "@/server/data";
import { getDb } from "@/server/db/client";
import { checkins, planStops, plans, revealedCells } from "@/server/db/schema";
import { sessionProfileId } from "@/server/session";

// Live night for the prototype (D-067): checking in at a plan's spot (F6.2, F6.3) and the
// organizer ending the plan (F6.4).

const checkinInput = z.object({
  planId: z.uuid(),
  seq: z.number().int().min(0).default(0),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative(),
});

export async function checkIn(
  input: unknown,
): Promise<CheckinResult | { valid: false; reason: "no-profile" | "not-found" }> {
  const attempt = checkinInput.parse(input);
  const me = await sessionProfileId();
  if (!me) return { valid: false, reason: "no-profile" };
  const db = getDb();
  const [row] = await db
    .select({ startsAt: plans.startsAt, endedAt: plans.endedAt, placeId: planStops.placeId })
    .from(plans)
    .innerJoin(planStops, and(eq(planStops.planId, plans.id), eq(planStops.seq, attempt.seq)))
    .where(eq(plans.id, attempt.planId));
  const place = row ? data.places().find((p) => p.id === row.placeId) : undefined;
  if (!row || !place) return { valid: false, reason: "not-found" };
  const now = new Date();
  const result = checkInValidity(
    { at: { lat: attempt.lat, lon: attempt.lon }, accuracyM: attempt.accuracyM, time: now },
    { spot: place, startsAt: row.startsAt, endedAt: row.endedAt },
  );
  await db.insert(checkins).values({
    ts: now,
    profileId: me,
    planId: attempt.planId,
    placeId: place.id,
    lat: attempt.lat,
    lon: attempt.lon,
    accuracyM: attempt.accuracyM,
    valid: result.valid,
  });
  if (result.valid) {
    const { cells, state } = revealAround("checkin", place);
    await db
      .insert(revealedCells)
      .values(cells.map((h3) => ({ profileId: me, h3, state, source: "checkin" as const })))
      .onConflictDoUpdate({
        target: [revealedCells.profileId, revealedCells.h3],
        set: { state: sql`'visited'` },
      });
  }
  return result;
}

export async function endPlan(input: unknown) {
  const { planId } = z.object({ planId: z.uuid() }).parse(input);
  const me = await sessionProfileId();
  if (!me) return { kind: "no-profile" as const };
  const ended = await getDb()
    .update(plans)
    .set({ status: "ended", endedAt: new Date() })
    .where(and(eq(plans.id, planId), eq(plans.createdBy, me), sql`${plans.status} <> 'ended'`))
    .returning({ id: plans.id });
  if (ended.length === 0) return { kind: "not-allowed" as const };
  return { kind: "ended" as const, badges: await awardNightBadges(planId) };
}
