"use server";

import { z } from "zod";
import { getDb } from "@/server/db/client";
import { currentProfile } from "@/server/profile";
import { copyWeeklyPlan, weeklyPlansFor, type WeeklyPlan } from "@/server/weekly";

/** This week's suggested plans (F10.4). They're the same for everyone. */
export async function thisWeeksPlans(): Promise<WeeklyPlan[]> {
  return weeklyPlansFor(getDb(), new Date());
}

/** "Invite friends" (F10.5): the viewer's own copy of a weekly plan, with its invite link. */
export async function inviteToWeeklyPlan(weeklyId: unknown) {
  const id = z.uuid().parse(weeklyId);
  const creator = await currentProfile();
  if (!creator) return { kind: "no-profile" as const };
  const copy = await copyWeeklyPlan(getDb(), id, creator);
  return copy ? { kind: "created" as const, ...copy } : { kind: "unknown-plan" as const };
}
