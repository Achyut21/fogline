import { and, eq, inArray } from "drizzle-orm";
import { squadCells, squadStreak, squads, type SquadCell } from "@/lib/squad";
import type { Db } from "@/server/db/client";
import { checkins, plans, profiles, revealedCells } from "@/server/db/schema";

const earlyMs = 30 * 60_000;

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
            endedAt: plans.endedAt,
          })
          .from(checkins)
          .innerJoin(plans, eq(plans.id, checkins.planId))
          .where(and(inArray(checkins.planId, planIds), eq(checkins.valid, true)));
  const mates = squads(rows, new Set(planIds)).get(profileId) ?? new Set<string>();
  const ids = [profileId, ...mates];

  const sharedNights = new Map<string, Date>();
  // The nights the viewer shared with each mate, as check-in windows (DATA 3.9, 3.12).
  const together = new Map<string, { from: Date; to: Date }[]>();
  for (const row of rows) {
    if (row.profileId === profileId || !mates.has(row.profileId)) continue;
    sharedNights.set(row.planId, row.startsAt);
    if (row.endedAt === null) continue;
    const windows = together.get(row.profileId) ?? [];
    windows.push({ from: new Date(row.startsAt.getTime() - earlyMs), to: row.endedAt });
    together.set(row.profileId, windows);
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
        source: revealedCells.source,
        firstAt: revealedCells.firstAt,
      })
      .from(revealedCells)
      .where(inArray(revealedCells.profileId, ids)),
  ]);
  // A mate's map shows only what they uncovered checking in on a night you shared. Rides can be
  // replays played from anywhere, home included, so they stay off (D-078). Your own cells all count.
  const visible = cells.filter((cell) => {
    if (cell.profileId === profileId) return true;
    if (cell.source !== "checkin") return false;
    return (together.get(cell.profileId) ?? []).some(
      (w) => cell.firstAt >= w.from && cell.firstAt <= w.to,
    );
  });
  const names = new Map(people.map((p) => [p.id, p.name]));
  return {
    members: ids
      .flatMap((id) => {
        const name = names.get(id);
        return name === undefined ? [] : [{ id, name, you: id === profileId }];
      })
      .sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name)),
    cells: squadCells(visible),
    streak: squadStreak([...sharedNights.values()], now),
  };
}
