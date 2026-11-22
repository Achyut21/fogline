import { trainsRunning } from "@/lib/gtfs/service";
import type { Graph, Timetable } from "@/lib/gtfs/types";
import {
  gradedCategories,
  placeCategories,
  type Grade,
  type Place,
  type PlaceCategory,
} from "@/lib/places/types";
import { dayTypeOf, hourBucketOf, toServiceTime } from "@/lib/time";
import { travelTimesFrom, type Travel } from "./travel";

const maxTravelSeconds = 75 * 60;
const maxWalkM = 600;
const optionCount = 3;

export type Participant = { id: string; station: string };

export type SpotFilters = {
  categories: readonly PlaceCategory[];
  /** Highest price band allowed, or null for any. Spots with unknown prices pass. */
  budget: 1 | 2 | 3 | null;
  minGrade: "A" | "B" | null;
  /** True once any joined participant is under 21: no bars, clubs or other 21+ spots (F1.5, F4.9). */
  under21: boolean;
};

export type RankedStation = {
  station: string;
  score: number;
  total: number;
  times: { participant: string; travel: Travel }[];
};

export type FairOption = RankedStation & { spots: { place: Place; walkM: number }[] };

/**
 * What blocks every option, so the UI can offer to relax it (F4.6): one filter, or two or three
 * that only work relaxed together; "time" when no station is within 75 minutes for everyone;
 * "no-trains" when no train runs then; "spots" when even every category gives none.
 */
export type Blocker = "budget" | "minGrade" | "categories" | "time" | "no-trains" | "spots";

export type FairResult =
  { kind: "options"; options: FairOption[] } | { kind: "none"; blockedBy: Blocker[] };

/**
 * Every station everyone can reach, best first by `S(d) = max(t) + 0.5 × (max(t) − min(t))`,
 * ties broken by `sum(t)` (F4.3, DATA 3.2). A station is out when anyone can't reach it or needs
 * more than 75 minutes.
 */
export function rankStations(
  graph: Graph,
  participants: Participant[],
  startsAt: Date,
): RankedStation[] {
  if (participants.length === 0) throw new Error("A plan needs at least one participant");
  const unknown = participants.find((p) => !graph.stations.includes(p.station));
  if (unknown) throw new Error(`Unknown station for ${unknown.id}: "${unknown.station}"`);
  const { serviceDate, seconds } = toServiceTime(startsAt);
  const dayType = dayTypeOf(serviceDate);
  const bucket = hourBucketOf(seconds);
  const fromEach = participants.map((p) => ({
    participant: p.id,
    times: travelTimesFrom(graph, p.station, dayType, bucket),
  }));

  const ranked: RankedStation[] = [];
  for (const station of graph.stations) {
    const times = fromEach.map(({ participant, times: all }) => ({
      participant,
      travel: all.get(station),
    }));
    const reachable = times.flatMap((t) => (t.travel ? [{ ...t, travel: t.travel }] : []));
    if (reachable.length < times.length) continue;
    const seconds = reachable.map((t) => t.travel.seconds);
    const max = Math.max(...seconds);
    if (max > maxTravelSeconds) continue;
    const min = Math.min(...seconds);
    ranked.push({
      station,
      score: max + 0.5 * (max - min),
      total: seconds.reduce((sum, s) => sum + s, 0),
      times: reachable,
    });
  }
  return ranked.sort(
    (a, b) =>
      a.score - b.score ||
      a.total - b.total ||
      (a.station < b.station ? -1 : a.station > b.station ? 1 : 0),
  );
}

const adultCategories: readonly PlaceCategory[] = ["bar", "club"];

/** A spot with a grade must meet the minimum; an unmatched spot fails it only where people eat. */
function meetsGrade(place: Place, minGrade: "A" | "B"): boolean {
  const letter: Grade | undefined = place.grade?.letter;
  if (letter === undefined) return !gradedCategories.includes(place.category);
  return letter === "A" || (minGrade === "B" && letter === "B");
}

/** Spots within 600 m walking of a station that match the filters, nearest first (F4.5). */
export function spotsNear(
  places: Place[],
  station: string,
  filters: SpotFilters,
): { place: Place; walkM: number }[] {
  const spots: { place: Place; walkM: number }[] = [];
  for (const place of places) {
    const near = place.stations.find((s) => s.id === station);
    if (!near || near.walkM > maxWalkM) continue;
    if (!filters.categories.includes(place.category)) continue;
    if (
      filters.under21 &&
      (place.ageRule === "21plus" || adultCategories.includes(place.category))
    ) {
      continue;
    }
    if (filters.budget !== null && place.price !== null && place.price > filters.budget) continue;
    if (filters.minGrade !== null && !meetsGrade(place, filters.minGrade)) continue;
    spots.push({ place, walkM: near.walkM });
  }
  return spots.sort(
    (a, b) =>
      a.walkM - b.walkM ||
      a.place.name.localeCompare(b.place.name) ||
      (a.place.id < b.place.id ? -1 : a.place.id > b.place.id ? 1 : 0),
  );
}

function pick(ranked: RankedStation[], places: Place[], filters: SpotFilters): FairOption[] {
  const options: FairOption[] = [];
  for (const station of ranked) {
    const spots = spotsNear(places, station.station, filters);
    if (spots.length > 0) options.push({ ...station, spots });
    if (options.length === optionCount) break;
  }
  return options;
}

/**
 * Up to three fair options at different stations, each with its matching spots (F4.3–F4.5).
 * When none exists, names what to relax (F4.6): one filter at a time first, in the order budget,
 * minimum grade, category, then the same filters together. The age rule is never relaxed.
 */
export function fairOptions(
  graph: Graph,
  timetable: Timetable,
  places: Place[],
  participants: Participant[],
  startsAt: Date,
  filters: SpotFilters,
): FairResult {
  const ranked = rankStations(graph, participants, startsAt);
  if (trainsRunning(timetable, startsAt) === false)
    return { kind: "none", blockedBy: ["no-trains"] };
  if (ranked.length === 0) return { kind: "none", blockedBy: ["time"] };
  const options = pick(ranked, places, filters);
  if (options.length > 0) return { kind: "options", options };

  const relaxations: [Blocker, Partial<SpotFilters>][] = [
    ["budget", { budget: null }],
    ["minGrade", { minGrade: null }],
    ["categories", { categories: placeCategories }],
  ];
  for (const [blocker, change] of relaxations) {
    if (pick(ranked, places, { ...filters, ...change }).length > 0) {
      return { kind: "none", blockedBy: [blocker] };
    }
  }
  const blockers: Blocker[] = [];
  let loosened = filters;
  for (const [blocker, change] of relaxations) {
    blockers.push(blocker);
    loosened = { ...loosened, ...change };
    if (pick(ranked, places, loosened).length > 0) return { kind: "none", blockedBy: blockers };
  }
  return { kind: "none", blockedBy: ["spots"] };
}
