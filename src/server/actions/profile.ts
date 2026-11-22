"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { onboarding } from "@/copy";
import { getDb } from "@/server/db/client";
import { ageBands } from "@/server/db/schema";
import { insertProfile, profileIdByCode } from "@/server/profile";
import { parseProfileCode } from "@/server/profile-code";
import { schools } from "@/server/schools";
import { startSession } from "@/server/session";
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
