"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { plans } from "@/server/db/schema";
import { isParticipant, recapOf, type Recap } from "@/server/recap";
import { sessionProfileId } from "@/server/session";

// Who may see a night's recap (F9.4): someone holding the plan's invite token, or a profile that
// sat in the plan. Anyone else gets nothing, the same as a missing plan.

export async function recapByInvite(token: unknown): Promise<Recap | null> {
  const parsed = z.string().min(8).max(64).safeParse(token);
  if (!parsed.success) return null;
  const db = getDb();
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.inviteToken, parsed.data));
  return plan ? recapOf(db, plan.id) : null;
}

export async function recapForPlan(planId: unknown): Promise<Recap | null> {
  const parsed = z.uuid().safeParse(planId);
  const me = await sessionProfileId();
  if (!parsed.success || !me) return null;
  const db = getDb();
  return (await isParticipant(db, parsed.data, me)) ? recapOf(db, parsed.data) : null;
}
