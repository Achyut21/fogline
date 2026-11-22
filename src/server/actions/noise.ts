"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { floorDb } from "@/lib/noise";
import { getDb } from "@/server/db/client";
import { noiseReadings } from "@/server/db/schema";
import { isSegment, sensoryPreview, type SensoryPreview } from "@/server/noise";
import { currentProfile } from "@/server/profile";

// One measured segment from calm mode (F13.1, F13.2): two numbers computed on the phone. No audio
// reaches the server. A profile can send one reading a minute, about one segment's ride.

const level = z.number().min(floorDb).max(0);
const input = z.object({
  route: z.string().min(1).max(20),
  from: z.string().min(1).max(40),
  to: z.string().min(1).max(40),
  dbAvg: level,
  dbPeak: level,
});

export type NoiseResult =
  { kind: "recorded" } | { kind: "rejected"; reason: "no-profile" | "segment" | "too-soon" };

export async function recordNoise(raw: unknown): Promise<NoiseResult> {
  const reading = input.parse(raw);
  const profile = await currentProfile();
  if (!profile) return { kind: "rejected", reason: "no-profile" };
  if (!isSegment(reading) || reading.dbPeak < reading.dbAvg) {
    return { kind: "rejected", reason: "segment" };
  }
  const db = getDb();
  const now = new Date();
  // One reading a minute per profile, checked under a per-profile lock so two sends at once
  // can't both pass.
  const recorded = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${profile.id}))`);
    const [recent] = await tx
      .select({ ts: noiseReadings.ts })
      .from(noiseReadings)
      .where(
        and(
          eq(noiseReadings.profileId, profile.id),
          gte(noiseReadings.ts, new Date(now.getTime() - 60_000)),
        ),
      )
      .limit(1);
    if (recent) return false;
    await tx.insert(noiseReadings).values({
      ts: now,
      profileId: profile.id,
      routeId: reading.route,
      fromStopId: reading.from,
      toStopId: reading.to,
      dbAvg: reading.dbAvg,
      dbPeak: reading.dbPeak,
      isDemo: profile.isDemo,
    });
    return true;
  });
  if (!recorded) return { kind: "rejected", reason: "too-soon" };
  return { kind: "recorded" };
}

/** A station's sensory preview for its sheet (F13.5). */
export async function stationSensory(station: unknown): Promise<SensoryPreview> {
  return sensoryPreview(getDb(), z.string().min(1).max(40).parse(station));
}
