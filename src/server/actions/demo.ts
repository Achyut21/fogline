"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db/client";
import { profiles } from "@/server/db/schema";
import { seedDemo } from "@/server/demo";
import { currentProfile } from "@/server/profile";
import { startSession } from "@/server/session";

// Demo mode (F16.1, F16.2): each start seeds a fresh copy and signs in as its profile. A visitor
// already in a demo copy keeps it, and seeding stops past a cap per hour, since anyone can call this.

const copiesPerHour = 200;
// Each copy seeds three profiles.
const profilesPerCopy = 3;

export type DemoState = { error: "busy" | "failed" } | undefined;

export async function startDemo(): Promise<DemoState> {
  const current = await currentProfile();
  if (current?.isDemo) redirect("/");
  const db = getDb();
  const hourAgo = new Date(Date.now() - 60 * 60_000);
  const [recent] = await db
    .select({ n: count() })
    .from(profiles)
    .where(and(eq(profiles.isDemo, true), gte(profiles.createdAt, hourAgo)));
  if ((recent?.n ?? 0) >= copiesPerHour * profilesPerCopy) return { error: "busy" };
  let profileId: string;
  try {
    ({ profileId } = await seedDemo(db));
  } catch (e) {
    if (!(e instanceof Error)) throw e;
    return { error: "failed" };
  }
  await startSession(profileId, true);
  redirect("/");
}
