"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revealAround } from "@/lib/geo/cells";
import { getDb } from "@/server/db/client";
import { profiles, revealedCells, rideEvents } from "@/server/db/schema";
import { recordedRide } from "@/server/replay";
import { sessionProfileId } from "@/server/session";
import { stationById } from "@/server/stations";

// A replayed stop (F3.3, F3.5, F3.8): the server rebuilds the ride from the recorded trip, so the
// client only says how far the replay got. Each stop writes its ride event, flagged as a replay,
// and marks the cells around the station as seen (D-063: replays clear fog but earn no badges).

const stopInput = z.object({
  tripId: z.string().min(1).max(80),
  from: z.string().min(1).max(40),
  index: z.number().int().min(0).max(80),
});

export type ReplayStopResult =
  { kind: "recorded"; newCells: string[] } | { kind: "no-profile" } | { kind: "not-found" };

export async function recordReplayStop(input: unknown): Promise<ReplayStopResult> {
  const { tripId, from, index } = stopInput.parse(input);
  const me = await sessionProfileId();
  if (!me) return { kind: "no-profile" };
  const db = getDb();
  const ride = await recordedRide(db, tripId, from);
  const stop = ride?.stops[index];
  const station = stop ? stationById(stop.station) : undefined;
  if (!ride || !stop || !station) return { kind: "not-found" };
  const { cells, state } = revealAround("ride", station);
  // A demo profile's replay is demo data, kept out of How it works' real counts (F16.2).
  const [profile] = await db
    .select({ isDemo: profiles.isDemo })
    .from(profiles)
    .where(eq(profiles.id, me));
  const added = await db.transaction(async (tx) => {
    await tx.insert(rideEvents).values({
      isDemo: profile?.isDemo ?? false,
      ts: new Date(),
      profileId: me,
      tripId,
      routeId: ride.route,
      stopId: station.id,
      event: stop.event,
      isReplay: true,
    });
    return tx
      .insert(revealedCells)
      .values(cells.map((h3) => ({ profileId: me, h3, state, source: "ride" as const })))
      .onConflictDoNothing()
      .returning({ h3: revealedCells.h3 });
  });
  return { kind: "recorded", newCells: added.map((c) => c.h3) };
}
