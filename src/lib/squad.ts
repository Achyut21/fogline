import { addDays, mondayOf, serviceDateOf } from "@/lib/time";

/**
 * Squad mates (F12.1): two profiles become squad members once both have a valid check-in on the
 * same ended plan. Returns each profile's mates.
 */
export function squads(
  checkins: readonly { profileId: string; planId: string; valid: boolean }[],
  endedPlans: ReadonlySet<string>,
): Map<string, Set<string>> {
  const byPlan = new Map<string, Set<string>>();
  for (const c of checkins) {
    if (!c.valid || !endedPlans.has(c.planId)) continue;
    const people = byPlan.get(c.planId) ?? new Set<string>();
    people.add(c.profileId);
    byPlan.set(c.planId, people);
  }
  const mates = new Map<string, Set<string>>();
  for (const people of byPlan.values()) {
    for (const person of people) {
      const theirs = mates.get(person) ?? new Set<string>();
      for (const other of people) if (other !== person) theirs.add(other);
      if (theirs.size > 0) mates.set(person, theirs);
    }
  }
  return mates;
}

export type SquadCell = { h3: string; state: "seen" | "visited"; by: string };

/**
 * The squad map (F12.2): the union of members' uncovered cells. A cell is visited when any member
 * visited it, and it is credited to whoever uncovered it first (ties by profile ID).
 */
export function squadCells(
  rows: readonly { profileId: string; h3: string; state: "seen" | "visited"; firstAt: Date }[],
): SquadCell[] {
  const cells = new Map<string, SquadCell & { firstAt: Date }>();
  for (const row of rows) {
    const cell = cells.get(row.h3);
    if (!cell) {
      cells.set(row.h3, { h3: row.h3, state: row.state, by: row.profileId, firstAt: row.firstAt });
      continue;
    }
    if (row.state === "visited") cell.state = "visited";
    const earlier = row.firstAt.getTime() - cell.firstAt.getTime();
    if (earlier < 0 || (earlier === 0 && row.profileId < cell.by)) {
      cell.by = row.profileId;
      cell.firstAt = row.firstAt;
    }
  }
  return [...cells.values()]
    .map(({ h3, state, by }) => ({ h3, state, by }))
    .sort((a, b) => (a.h3 < b.h3 ? -1 : a.h3 > b.h3 ? 1 : 0));
}

/**
 * The squad streak (F12.3, D-071): consecutive Monday-to-Sunday weeks, by service date in Boston,
 * with at least one ended plan where you and a squad mate both checked in. This week counts once
 * it has one; until then the streak runs to last week, so it only breaks when a week ends empty.
 */
export function squadStreak(nights: readonly Date[], now: Date): number {
  const weeks = new Set(nights.map((at) => mondayOf(serviceDateOf(at))));
  const thisWeek = mondayOf(serviceDateOf(now));
  let week = weeks.has(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  let count = 0;
  while (weeks.has(week)) {
    count++;
    week = addDays(week, -7);
  }
  return count;
}
