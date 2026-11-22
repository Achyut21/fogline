import { TZDate } from "@date-fns/tz";
import type { RevealSource } from "@/lib/geo/cells";
import type { Region } from "@/lib/geo/regions";
import type { Station } from "@/lib/gtfs/types";
import {
  greenBranches,
  lastTrainGraceMs,
  lastTrainMargin,
  live,
  ridden,
  rideHomeStart,
  stationIndex,
  type LastTrainHome,
  type Line,
  type RideEvent,
} from "@/lib/rides";
import { linesRidden } from "@/lib/stats";
import { zone } from "@/lib/time";

export const nightBadges = [
  "first-in",
  "fashionably-late",
  "on-the-dot",
  "long-haul",
  "closest-call",
  "night-owl",
  "ghost",
  "planner",
] as const;
export type NightBadge = (typeof nightBadges)[number];

export const explorerBadges = [
  "first-light",
  "all-four-lines",
  "fifty-stations",
  "every-green-branch",
] as const;
export type ExplorerBadge = (typeof explorerBadges)[number];

const shareMs = 30_000;
const lateMs = 10 * 60_000;
const onTheDotMs = 2 * 60_000;
const nightOwlBeforeHour = 5;
const stationsForBadge = 50;
const firstLightMinCells = 3;
const fourLines: readonly Line[] = ["Red", "Orange", "Blue", "Green"];

export type NightCheckin = { profileId: string; placeId: string; ts: Date; valid: boolean };

/**
 * Everything a plan's night badges are computed from (F8.1, DATA 3.10). They're computed when the
 * plan ends and again once every last train home has left plus 10 minutes, when the rides home
 * are in; awards are only added (F8.6).
 */
export type Night = {
  /** When the awards are computed. Closest Call waits until every last train has left. */
  at: Date;
  createdBy: string | null;
  startsAt: Date;
  firstPlaceId: string;
  /** The last stop's scheduled time. The ride home is looked for after it. */
  lastStopAt: Date;
  /** Seats held by a profile. Placeholders never get badges. */
  participants: readonly { profileId: string; rsvp: "pending" | "yes" | "no" }[];
  checkins: readonly NightCheckin[];
  /** Each person's ride events from their last check-in on, with or without the plan's ID. */
  rideEvents: readonly (RideEvent & { profileId: string })[];
  /** Each person's travel time `t_i` to the first stop, in seconds. */
  travelSeconds: ReadonlyMap<string, number>;
  /** Each person's last train home from the last stop's station. */
  lastTrains: ReadonlyMap<string, LastTrainHome>;
};

export type NightAward = { profileId: string; badge: NightBadge };

/** People whose value is the smallest, or the largest with `most`. Exact ties share it. */
function extreme(values: ReadonlyMap<string, number>, most: boolean): string[] {
  const best = most ? Math.max(...values.values()) : Math.min(...values.values());
  return [...values].filter(([, value]) => value === best).map(([id]) => id);
}

const ids = (entries: [string, number][]) => entries.map(([id]) => id);

/**
 * Night badges for an ended plan, from valid check-ins only. A badge that compares people needs
 * at least 2 people in its comparison (D-063).
 */
export function nightAwards(night: Night): NightAward[] {
  const valid = night.checkins.filter((c) => c.valid);
  const checkedIn = new Set(valid.map((c) => c.profileId));
  const awards: NightAward[] = [];
  const give = (badge: NightBadge, profileIds: Iterable<string>) => {
    for (const profileId of profileIds) awards.push({ profileId, badge });
  };

  const arrivals = new Map<string, number>();
  for (const c of valid) {
    if (c.placeId !== night.firstPlaceId) continue;
    const earlier = arrivals.get(c.profileId);
    if (earlier === undefined || c.ts.getTime() < earlier) {
      arrivals.set(c.profileId, c.ts.getTime());
    }
  }
  const arrived = [...arrivals];
  const start = night.startsAt.getTime();
  if (arrivals.size >= 2) {
    const first = Math.min(...arrivals.values());
    const last = Math.max(...arrivals.values());
    give("first-in", ids(arrived.filter(([, at]) => at - first <= shareMs)));
    give(
      "fashionably-late",
      ids(
        arrived.filter(
          ([, at]) => at - start >= lateMs && last - at <= shareMs && at - first > shareMs,
        ),
      ),
    );
  }
  give("on-the-dot", ids(arrived.filter(([, at]) => Math.abs(at - start) <= onTheDotMs)));

  const hauls = new Map([...night.travelSeconds].filter(([id]) => checkedIn.has(id)));
  if (hauls.size >= 2) give("long-haul", extreme(hauls, true));

  const trains = [...night.lastTrains.values()].map((t) => t.departs.getTime());
  const homeTime =
    trains.length > 0 && night.at.getTime() >= Math.max(...trains) + lastTrainGraceMs;
  const margins = new Map<string, number>();
  for (const [id, lastTrain] of homeTime ? night.lastTrains : []) {
    const after = rideHomeStart(
      night.lastStopAt,
      valid.filter((c) => c.profileId === id).map((c) => c.ts),
    );
    if (after === null) continue;
    const events = night.rideEvents.filter((e) => e.profileId === id);
    const margin = lastTrainMargin(events, after, lastTrain);
    if (margin !== null) margins.set(id, margin);
  }
  if (margins.size >= 2) give("closest-call", extreme(margins, false));

  give(
    "night-owl",
    [...checkedIn].filter((id) =>
      valid.some(
        (c) =>
          c.profileId === id && new TZDate(c.ts.getTime(), zone).getHours() < nightOwlBeforeHour,
      ),
    ),
  );
  if (checkedIn.size > 0) {
    give(
      "ghost",
      night.participants
        .filter((p) => p.rsvp === "yes" && !checkedIn.has(p.profileId))
        .map((p) => p.profileId),
    );
  }
  if (night.createdBy !== null && checkedIn.size >= 2) give("planner", [night.createdBy]);
  return awards;
}

/**
 * For each region, when the profile's uncovered share first reached 50%: the time its
 * ceil(n / 2)-th cell left the fog. Regions still under 50% are left out, and so are regions under
 * 3 cells, where one reveal would reach 50% (D-062). Cells revealed by the home station don't
 * count: choosing a home isn't uncovering anything. Cells cleared by a replay do, like all fog.
 */
export function halfUncoveredAt(
  regions: readonly Region[],
  revealed: readonly { h3: string; firstAt: Date; source: RevealSource }[],
): Map<string, Date> {
  const firstAt = new Map(
    revealed
      .filter((cell) => cell.source !== "home")
      .map((cell) => [cell.h3, cell.firstAt.getTime()]),
  );
  const reached = new Map<string, Date>();
  for (const region of regions) {
    if (region.cells.length < firstLightMinCells) continue;
    const times = region.cells
      .map((cell) => firstAt.get(cell))
      .filter((t) => t !== undefined)
      .sort((a, b) => a - b);
    const needed = Math.ceil(region.cells.length / 2);
    if (times.length >= needed) reached.set(region.id, new Date(times[needed - 1]));
  }
  return reached;
}

/**
 * Regions where the profile reached 50% and no squad mate reached it more than 30 s earlier
 * (F8.2), so mates who uncovered it together share it. A profile without a squad is its own
 * first. Awards are never taken back, so mates who each got it before they met both keep it.
 */
export function firstLightRegions(
  own: ReadonlyMap<string, Date>,
  mates: readonly ReadonlyMap<string, Date>[],
): string[] {
  return [...own]
    .filter(([region, at]) =>
      mates.every((mate) => {
        const theirs = mate.get(region);
        return theirs === undefined || at.getTime() - theirs.getTime() <= shareMs;
      }),
    )
    .map(([region]) => region);
}

export type ExplorerAward = { badge: ExplorerBadge; scope: string | null };

/**
 * Explorer badges a profile has earned from live rides (F8.2, DATA 3.10). First Light is scoped by
 * region. A Green branch counts only at a station that branch alone serves, not on the trunk.
 */
export function explorerAwards(input: {
  events: readonly RideEvent[];
  stations: readonly Station[];
  stationsVisited: number;
  firstLight: readonly string[];
}): ExplorerAward[] {
  const rides = ridden(live(input.events));
  const boardedLines = new Set(linesRidden(live(input.events)));
  const index = stationIndex(input.stations);
  const branchOnly = new Map(
    input.stations.filter((s) => s.routes.length === 1).map((s) => [s.id, s.routes[0]]),
  );
  const branches = new Set<string>();
  for (const e of rides) {
    if (e.stopId === null) continue;
    const station = index.get(e.stopId);
    if (station !== undefined && branchOnly.get(station) === e.routeId) branches.add(e.routeId);
  }
  const awards: ExplorerAward[] = input.firstLight.map((region) => ({
    badge: "first-light",
    scope: region,
  }));
  if (fourLines.every((line) => boardedLines.has(line))) {
    awards.push({ badge: "all-four-lines", scope: null });
  }
  if (input.stationsVisited >= stationsForBadge) {
    awards.push({ badge: "fifty-stations", scope: null });
  }
  if (greenBranches.every((branch) => branches.has(branch))) {
    awards.push({ badge: "every-green-branch", scope: null });
  }
  return awards;
}
