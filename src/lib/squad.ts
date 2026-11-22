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
