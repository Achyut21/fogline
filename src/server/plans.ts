import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { planParticipants, plans } from "@/server/db/schema";

export type PlanSummary = {
  id: string;
  title: string;
  startsAt: Date;
  status: string;
  inviteToken: string;
  people: number;
};

// A plan nobody ended still moves to Past this long after it starts.
const pastAfterMs = 6 * 60 * 60_000;

/** The plans a profile is in, upcoming soonest first and past newest first (the Plans tab). */
export async function myPlans(db: Db, profileId: string, now = new Date()) {
  const all = await plansOf(db, profileId);
  const cutoff = now.getTime() - pastAfterMs;
  const isPast = (p: PlanSummary) => p.status === "ended" || p.startsAt.getTime() < cutoff;
  return { upcoming: all.filter((p) => !isPast(p)).reverse(), past: all.filter(isPast) };
}

async function plansOf(db: Db, profileId: string): Promise<PlanSummary[]> {
  const mine = db
    .select({ planId: planParticipants.planId })
    .from(planParticipants)
    .where(eq(planParticipants.profileId, profileId));
  return db
    .select({
      id: plans.id,
      title: plans.title,
      startsAt: plans.startsAt,
      status: plans.status,
      inviteToken: plans.inviteToken,
      // Drizzle writes columns unqualified inside sql``, so the correlation names the tables.
      people: sql<number>`(select count(*)::int from plan_participants pp where pp.plan_id = ${plans}.id)`,
    })
    .from(plans)
    .where(sql`${plans.id} in ${mine}`)
    .orderBy(desc(plans.startsAt))
    .limit(30);
}
