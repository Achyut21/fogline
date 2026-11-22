"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/server/db/client";
import { seedDemo } from "@/server/demo";
import { startSession } from "@/server/session";

// Demo mode (F16.1, F16.2): each start seeds a fresh copy and signs in as its profile.
export async function startDemo() {
  const { profileId } = await seedDemo(getDb());
  await startSession(profileId, true);
  redirect("/");
}
