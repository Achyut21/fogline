"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { plans } from "@/server/db/schema";
import { currentProfile } from "@/server/profile";
import { isParticipant, recapOf, type Recap } from "@/server/recap";

// Who sees what of a night's recap (F9.4, F4.8, F4.9, F16.2):
// - a participant, or anyone holding the invite token, sees the recap;
// - only participants see routes, which start at home stations;
// - a bar or club is hidden from anyone not known to be 21+;
// - demo and real never mix.

const inviteToken = z.union([
  z.string().regex(/^[A-HJ-NP-Z2-9]{12}$/),
  z.string().regex(/^demo-[2-9A-HJ-NP-Z]{16}$/),
]);

async function shown(recap: Recap | null, viaInvite: boolean): Promise<Recap | null> {
  if (!recap) return null;
  const viewer = await currentProfile();
  if ((viewer?.isDemo ?? recap.isDemo) !== recap.isDemo) return null;
  const member = viewer !== null && (await isParticipant(getDb(), recap.planId, viewer.id));
  if (!member && !viaInvite) return null;
  const hideSpot = recap.adultsOnly && viewer?.ageBand !== "21plus";
  return { ...recap, spot: hideSpot ? null : recap.spot, routes: member ? recap.routes : [] };
}

export async function recapByInvite(token: unknown): Promise<Recap | null> {
  const parsed = inviteToken.safeParse(token);
  if (!parsed.success) return null;
  const db = getDb();
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.inviteToken, parsed.data));
  return plan ? shown(await recapOf(db, plan.id), true) : null;
}

export async function recapForPlan(planId: unknown): Promise<Recap | null> {
  const parsed = z.uuid().safeParse(planId);
  if (!parsed.success) return null;
  return shown(await recapOf(getDb(), parsed.data), false);
}
