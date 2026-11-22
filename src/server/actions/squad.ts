"use server";

import { getDb } from "@/server/db/client";
import { currentProfile } from "@/server/profile";
import { squadOf, type Squad } from "@/server/squad";

/** The viewer's squad map, members and streak (F12.2, F12.3), or null without a profile. */
export async function mySquad(): Promise<Squad | null> {
  const viewer = await currentProfile();
  return viewer ? squadOf(getDb(), viewer.id, new Date()) : null;
}
