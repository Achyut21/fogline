"use server";

import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import type { CellState } from "@/lib/geo/cells";
import { bostonShare, regionSchema, regionShares } from "@/lib/geo/regions";
import { live, stationIndex, stationsVisited } from "@/lib/rides";
import { linesRidden, milesOnT, nightsOut, stopsCount } from "@/lib/stats";
import { shapeLineSchema } from "@/lib/gtfs/types";
import { readFileSync } from "node:fs";
import path from "node:path";
import { data } from "@/server/data";
import { getDb } from "@/server/db/client";
import { badgesAwarded, checkins, plans, revealedCells, rideEvents } from "@/server/db/schema";

// The Me screen's numbers for the prototype (F8.3, D-067): lifetime stats from the profile's
// rows, its badges, and how much of Boston it has uncovered.

const read = (name: string): unknown =>
  JSON.parse(readFileSync(path.join(process.cwd(), "data", name), "utf8"));
let regions: z.infer<typeof regionSchema>[] | null = null;
let shapes: z.infer<typeof shapeLineSchema>[] | null = null;

export async function myStats() {
  const id = (await cookies()).get("fogline_profile")?.value;
  if (!id || !z.uuid().safeParse(id).success) return null;
  regions ??= z.array(regionSchema).parse(read("neighborhoods-h3.json"));
  shapes ??= z.array(shapeLineSchema).parse(read("shapes.json"));
  const db = getDb();
  const [cells, rides, mine, badges, ended] = await Promise.all([
    db.select().from(revealedCells).where(eq(revealedCells.profileId, id)),
    db.select().from(rideEvents).where(eq(rideEvents.profileId, id)),
    db.select().from(checkins).where(eq(checkins.profileId, id)),
    db
      .select({
        badge: badgesAwarded.badgeId,
        scope: badgesAwarded.scope,
        at: badgesAwarded.awardedAt,
      })
      .from(badgesAwarded)
      .where(eq(badgesAwarded.profileId, id))
      .orderBy(desc(badgesAwarded.awardedAt)),
    db.select({ id: plans.id }).from(plans).where(eq(plans.status, "ended")),
  ]);
  const states = new Map<string, CellState>(cells.map((c) => [c.h3, c.state]));
  const events = live(rides);
  const stations = data.stations();
  const visited = stationsVisited(stations, events, mine);
  return {
    milesOnT: milesOnT(shapes, stationIndex(stations), events),
    stops: stopsCount(events),
    stationsVisited: visited.size,
    stationsTotal: stations.length,
    percentUncovered: Math.round(bostonShare(regions, states) * 100),
    neighborhoods: regionShares(regions, states).map((r) => ({
      ...r,
      percent: Math.round(r.share * 100),
    })),
    linesRidden: linesRidden(events),
    nightsOut: nightsOut(mine, new Set(ended.map((p) => p.id))),
    badges,
  };
}
