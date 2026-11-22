"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { inviteTokenInput } from "@/lib/invite-token";
import { getDb } from "@/server/db/client";
import { plans } from "@/server/db/schema";
import { currentProfile } from "@/server/profile";
import { isParticipant, recapOf, type Recap } from "@/server/recap";

// Who sees what of a night's recap (F9.4, F4.8, F4.9, F16.2):
// - a participant, or anyone holding the invite token, sees the recap;
// - only participants see routes and cleared cells, which start at home stations;
// - a bar or club, and the title that may name it, is hidden from anyone not known to be 21+;
// - demo and real never mix.

async function shown(recap: Recap | null, viaInvite: boolean): Promise<Recap | null> {
  if (!recap) return null;
  const viewer = await currentProfile();
  if ((viewer?.isDemo ?? recap.isDemo) !== recap.isDemo) return null;
  const member = viewer !== null && (await isParticipant(getDb(), recap.planId, viewer.id));
  if (!member && !viaInvite) return null;
  const hideSpot = recap.adultsOnly && viewer?.ageBand !== "21plus";
  return {
    ...recap,
    title: hideSpot ? null : recap.title,
    spot: hideSpot ? null : recap.spot,
    routes: member ? recap.routes : [],
    // Cleared cells trace riders' lines from home, so they're for members too (F4.8).
    clearedCells: member ? recap.clearedCells : [],
  };
}

export async function recapByInvite(token: unknown): Promise<Recap | null> {
  const parsed = inviteTokenInput.safeParse(token);
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
