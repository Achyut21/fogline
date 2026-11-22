import type { Graph } from "@/lib/gtfs/types";
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
  /** True once any joined participant is under 21: no 21+ spots anywhere (F1.5, F4.9). */
  under21: boolean;
};

export type RankedStation = {
  station: string;
  score: number;
  total: number;
  times: { participant: string; travel: Travel }[];
};

export type FairOption = RankedStation & { spots: { place: Place; walkM: number }[] };

/** The single filter that blocks every option, so the UI can offer to relax it (F4.6). */
export type Blocker = "budget" | "minGrade" | "categories" | "time" | "spots";

export type FairResult =
  { kind: "options"; options: FairOption[] } | { kind: "none"; blockedBy: Blocker };

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

function gradeAllowed(grade: Grade | undefined, minGrade: "A" | "B"): boolean {
  return grade === "A" || (minGrade === "B" && grade === "B");
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
    if (filters.under21 && place.ageRule === "21plus") continue;
    if (filters.budget !== null && place.price !== null && place.price > filters.budget) continue;
    if (
      filters.minGrade !== null &&
      gradedCategories.includes(place.category) &&
      !gradeAllowed(place.grade?.letter, filters.minGrade)
    ) {
      continue;
    }
    spots.push({ place, walkM: near.walkM });
  }
  return spots.sort((a, b) => a.walkM - b.walkM || (a.place.name < b.place.name ? -1 : 1));
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
 * When none exists, names the one filter whose relaxing would give options (F4.6).
 */
export function fairOptions(
  graph: Graph,
  places: Place[],
  participants: Participant[],
  startsAt: Date,
  filters: SpotFilters,
): FairResult {
  const ranked = rankStations(graph, participants, startsAt);
  if (ranked.length === 0) return { kind: "none", blockedBy: "time" };
  const options = pick(ranked, places, filters);
  if (options.length > 0) return { kind: "options", options };

  const relaxed: [Blocker, SpotFilters][] = [
    ["budget", { ...filters, budget: null }],
    ["minGrade", { ...filters, minGrade: null }],
    ["categories", { ...filters, categories: placeCategories }],
  ];
  for (const [blocker, loosened] of relaxed) {
    if (pick(ranked, places, loosened).length > 0) return { kind: "none", blockedBy: blocker };
  }
  return { kind: "none", blockedBy: "spots" };
}
