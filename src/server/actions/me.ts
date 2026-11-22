"use server";

import { and, desc, eq, inArray, ne } from "drizzle-orm";
import type { CellState } from "@/lib/geo/cells";
import { bostonShare, regionShares } from "@/lib/geo/regions";
import { live, stationIndex, stationsVisited } from "@/lib/rides";
import { linesRidden, milesOnT, nightsOut, stopsCount } from "@/lib/stats";
import { data } from "@/server/data";
import { getDb } from "@/server/db/client";
import { badgesAwarded, checkins, plans, revealedCells, rideEvents } from "@/server/db/schema";
import { sessionProfileId } from "@/server/session";

// The Me screen's numbers for the prototype (F8.3, D-067): lifetime stats from the profile's
// rows, its badges, and how much of Boston it has uncovered.

export async function myStats() {
  const id = await sessionProfileId();
  if (!id) return null;
  const regions = data.regions();
  const shapes = data.shapes();
  const db = getDb();
  const [cells, rides, mine, badges] = await Promise.all([
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
      .where(and(eq(badgesAwarded.profileId, id), ne(badgesAwarded.badgeId, "ghost")))
      .orderBy(desc(badgesAwarded.awardedAt)),
  ]);
  const myPlans = [...new Set(mine.map((c) => c.planId))];
  const ended =
    myPlans.length === 0
      ? []
      : await db
          .select({ id: plans.id })
          .from(plans)
          .where(and(eq(plans.status, "ended"), inArray(plans.id, myPlans)));
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
    /** The exact share, for one-decimal display like the map header. */
    shareUncovered: bostonShare(regions, states),
    neighborhoods: regionShares(regions, states).map((r) => ({
      ...r,
      percent: Math.round(r.share * 100),
    })),
    linesRidden: linesRidden(events),
    nightsOut: nightsOut(mine, new Set(ended.map((p) => p.id))),
    badges,
  };
}
