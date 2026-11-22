"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { onboarding } from "@/copy";
import { getDb } from "@/server/db/client";
import { ageBands, profiles } from "@/server/db/schema";
import { insertProfile, profileIdByCode } from "@/server/profile";
import { parseProfileCode } from "@/server/profile-code";
import { schools } from "@/server/schools";
import { endSession, sessionProfileId, startSession } from "@/server/session";
import { stationById } from "@/server/stations";

export type ActionState = { error: string | null };

const profileInput = z.object({
  name: z.string().trim().min(1).max(40),
  school: z.string().refine((name) => schools.some((s) => s.name === name)),
  homeStationId: z.string(),
  ageBand: z.enum(ageBands),
});

export async function createProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const input = profileInput.safeParse(Object.fromEntries(form));
  const home = input.success ? stationById(input.data.homeStationId) : undefined;
  if (!input.success || !home) return { error: onboarding.invalid };
  const { id } = await insertProfile(getDb(), { ...input.data, home });
  await startSession(id);
  redirect("/");
}

// F1.3: the code from Me on another device signs this browser in as the same profile.
export async function restoreProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const code = parseProfileCode(String(form.get("code") ?? ""));
  const id = code ? await profileIdByCode(getDb(), code) : null;
  if (!id) return { error: onboarding.restore.notFound };
  await startSession(id);
  redirect("/");
}

const ageInput = z.enum(ageBands);

/** Changes the profile's age band from Settings (F1.5). Plans already joined stay joined. */
export async function updateAgeBand(band: unknown): Promise<{ kind: "saved" | "no-profile" }> {
  const ageBand = ageInput.parse(band);
  const id = await sessionProfileId();
  if (!id) return { kind: "no-profile" };
  await getDb().update(profiles).set({ ageBand }).where(eq(profiles.id, id));
  return { kind: "saved" };
}

/**
 * Deletes the profile and everything that belongs to it (F1.7): the foreign keys cascade to cells,
 * check-ins, rides, readings, badges and puzzle results, and set the person's plan seats and the
 * plans they organized to no one, so those plans stay for the others with a "Former member".
 */
export async function deleteMyData(): Promise<{ kind: "no-profile" }> {
  const id = await sessionProfileId();
  if (!id) return { kind: "no-profile" };
  await getDb().delete(profiles).where(eq(profiles.id, id));
  await endSession();
  redirect("/welcome");
}
