import { and, eq, inArray } from "drizzle-orm";
import { squadCells, squadStreak, squads, type SquadCell } from "@/lib/squad";
import type { Db } from "@/server/db/client";
import { checkins, plans, profiles, revealedCells } from "@/server/db/schema";

export type Squad = {
  members: { id: string; name: string; you: boolean }[];
  cells: SquadCell[];
  streak: number;
};

/**
 * A profile's squad (F12.1–F12.3, D-071): the profile and its mates, their cells as one map with
 * who uncovered each first, and the weeks in a row with an ended plan shared with a mate.
 */
export async function squadOf(db: Db, profileId: string, now: Date): Promise<Squad> {
  const mine = await db
    .selectDistinct({ planId: checkins.planId })
    .from(checkins)
    .innerJoin(plans, eq(plans.id, checkins.planId))
    .where(
      and(eq(checkins.profileId, profileId), eq(checkins.valid, true), eq(plans.status, "ended")),
    );
  const planIds = mine.map((m) => m.planId);
  const rows =
    planIds.length === 0
      ? []
      : await db
          .select({
            profileId: checkins.profileId,
            planId: checkins.planId,
            valid: checkins.valid,
            startsAt: plans.startsAt,
          })
          .from(checkins)
          .innerJoin(plans, eq(plans.id, checkins.planId))
          .where(and(inArray(checkins.planId, planIds), eq(checkins.valid, true)));
  const mates = squads(rows, new Set(planIds)).get(profileId) ?? new Set<string>();
  const ids = [profileId, ...mates];

  const sharedNights = new Map<string, Date>();
  for (const row of rows) {
    if (row.profileId !== profileId && mates.has(row.profileId)) {
      sharedNights.set(row.planId, row.startsAt);
    }
  }

  const [people, cells] = await Promise.all([
    db
      .select({ id: profiles.id, name: profiles.displayName })
      .from(profiles)
      .where(inArray(profiles.id, ids)),
    db
      .select({
        profileId: revealedCells.profileId,
        h3: revealedCells.h3,
        state: revealedCells.state,
        firstAt: revealedCells.firstAt,
      })
      .from(revealedCells)
      .where(inArray(revealedCells.profileId, ids)),
  ]);
  const names = new Map(people.map((p) => [p.id, p.name]));
  return {
    members: ids
      .flatMap((id) => {
        const name = names.get(id);
        return name === undefined ? [] : [{ id, name, you: id === profileId }];
      })
      .sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name)),
    cells: squadCells(cells),
    streak: squadStreak([...sharedNights.values()], now),
  };
}
