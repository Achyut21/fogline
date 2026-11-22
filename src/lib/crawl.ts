import { walkM, walkMinutes, type LatLon } from "@/lib/geo/distance";
import { boardingSpans } from "@/lib/gtfs/service";
import type { Graph, Timetable } from "@/lib/gtfs/types";
import { leaveByFor, type LeaveBy } from "@/lib/lasttrain/leave-by";
import { openAt, type OpenState } from "@/lib/places/hours";
import type { Place } from "@/lib/places/types";
import {
  matchesFilters,
  rankStations,
  spotsNear,
  trainsAt,
  type Participant,
  type RankedStation,
  type SpotFilters,
} from "@/lib/solver/fair";
import { travelTimesFrom, type Travel } from "@/lib/solver/travel";
import { dayTypeOf, hourBucketOf, serviceDayOrigin, toServiceTime } from "@/lib/time";

// Crawls (F10.1–F10.3, DATA 3.15): 2–4 stops. The first stop is picked by fairness like a meetup;
// each next stop is the nearest matching spot within 10 minutes by walk or T; a spot known to be
// closed at its time is skipped and unknown hours are flagged; and everyone can stay the full
// time at the last stop before their last train home.

export const crawlStops = { min: 2, max: 4 } as const;
const maxLegMinutes = 10;
const optionCount = 3;
const firstSpotsTried = 5;
/** Fair stations with a matching first spot to try before giving up, which bounds the search. */
const stationsTried = 10;

export type CrawlLeg = { mode: "walk" | "T"; minutes: number };

export type CrawlStop = {
  place: Place;
  station: string;
  /** Walking meters between the spot and `station`. */
  walkM: number;
  scheduledAt: Date;
  hours: OpenState;
  /** How the group gets here from the previous stop; null for the first stop. */
  leg: CrawlLeg | null;
};

export type Crawl = {
  first: RankedStation;
  stops: CrawlStop[];
  leaveBy: { participant: string; leaveBy: LeaveBy }[];
};

export type CrawlBlocker = "time" | "no-trains" | "spots" | "last-train";

export type CrawlResult =
  { kind: "options"; crawls: Crawl[] } | { kind: "none"; blockedBy: CrawlBlocker };

export type CrawlRequest = {
  participants: (Participant & { home: LatLon })[];
  startsAt: Date;
  /** One filter set per stop, in order; the categories may differ, the rest usually don't (F10.2). */
  stops: SpotFilters[];
  stayMinutes: number;
};

const minute = 60_000;

/** What the T legs need: travel times by station, and when trains board at each station. */
export type Rides = {
  graph: Graph;
  /** The crawl's service-day origin; boarding spans count seconds from it. */
  origin: Date;
  spans: Map<string, { first: number; last: number }>;
  travel: Map<string, Map<string, Travel>>;
};

export function ridesFor(graph: Graph, timetable: Timetable, startsAt: Date): Rides {
  const { serviceDate } = toServiceTime(startsAt);
  const checked =
    serviceDate in timetable.dates ? serviceDate : graph.dates[dayTypeOf(serviceDate)];
  return {
    graph,
    origin: serviceDayOrigin(serviceDate),
    spans: boardingSpans(timetable, checked),
    travel: new Map(),
  };
}

/**
 * The fewest minutes from a spot to each station by T: a walk to a nearby station where a train
 * still boards then, and at least one ride (DATA 3.1 times; service checked per DATA 3.15).
 */
export function minutesByT(rides: Rides, from: Place, at: Date): Map<string, number> {
  const { serviceDate, seconds } = toServiceTime(at);
  const dayType = dayTypeOf(serviceDate);
  const bucket = hourBucketOf(seconds);
  const best = new Map<string, number>();
  for (const near of from.stations) {
    const walk = walkMinutes(near.walkM);
    const boards = (at.getTime() - rides.origin.getTime()) / 1000 + walk * 60;
    const span = rides.spans.get(near.id);
    if (!span || boards < span.first || boards > span.last) continue;
    const key = `${near.id}|${dayType}|${bucket}`;
    let times = rides.travel.get(key);
    if (!times) {
      times = travelTimesFrom(rides.graph, near.id, dayType, bucket);
      rides.travel.set(key, times);
    }
    for (const [station, travel] of times) {
      if (!travel.steps.some((step) => step.kind === "ride")) continue;
      const minutes = walk + travel.seconds / 60;
      if (minutes < (best.get(station) ?? Infinity)) best.set(station, minutes);
    }
  }
  return best;
}

type Next = { stop: CrawlStop; minutes: number };

function nextStop(
  rides: Rides,
  places: Place[],
  prev: CrawlStop,
  filters: SpotFilters,
  stayMinutes: number,
  used: Set<string>,
): CrawlStop | null {
  const leaves = new Date(prev.scheduledAt.getTime() + stayMinutes * minute);
  const byT = minutesByT(rides, prev.place, leaves);
  let best: Next | null = null;
  for (const place of places) {
    if (used.has(place.id) || place.stations.length === 0) continue;
    if (!matchesFilters(place, filters)) continue;
    const walk = walkMinutes(walkM(prev.place, place));
    let ride: { minutes: number; station: string; walkM: number } | null = null;
    for (const near of place.stations) {
      const toStation = byT.get(near.id);
      if (toStation === undefined) continue;
      const minutes = toStation + walkMinutes(near.walkM);
      if (!ride || minutes < ride.minutes) ride = { minutes, station: near.id, walkM: near.walkM };
    }
    const walked = ride === null || walk <= ride.minutes;
    const minutes = walked ? walk : (ride?.minutes ?? Infinity);
    if (minutes > maxLegMinutes) continue;
    const scheduledAt = new Date(leaves.getTime() + Math.ceil(minutes) * minute);
    const hours = openAt(place.hours, scheduledAt);
    if (hours === "closed") continue;
    const [nearest] = place.stations;
    const stop: CrawlStop = {
      place,
      station: walked || !ride ? nearest.id : ride.station,
      walkM: walked || !ride ? nearest.walkM : ride.walkM,
      scheduledAt,
      hours,
      leg: { mode: walked ? "walk" : "T", minutes: Math.ceil(minutes) },
    };
    if (!best || better({ stop, minutes }, best)) best = { stop, minutes };
  }
  return best?.stop ?? null;
}

/** Known hours first, then the shorter leg, then by name and ID so results are stable. */
function better(a: Next, b: Next): boolean {
  const known = (n: Next) => (n.stop.hours === "open" ? 0 : 1);
  return (
    (known(a) - known(b) ||
      a.minutes - b.minutes ||
      a.stop.place.name.localeCompare(b.stop.place.name) ||
      (a.stop.place.id < b.stop.place.id ? -1 : 1)) < 0
  );
}

/**
 * Up to three crawls, each starting at a different fair station (F10.3), or what blocks them:
 * "time" when no station is within 75 minutes for everyone, "no-trains" when no train runs then,
 * "last-train" when every crawl found ends after someone has to leave for their last train, and "spots"
 * when no chain of open spots fits.
 */
export function buildCrawls(
  graph: Graph,
  timetable: Timetable,
  places: Place[],
  request: CrawlRequest,
): CrawlResult {
  const { participants, startsAt, stops, stayMinutes } = request;
  if (stops.length < crawlStops.min || stops.length > crawlStops.max) {
    throw new Error(`A crawl has ${crawlStops.min} to ${crawlStops.max} stops`);
  }
  const ranked = rankStations(graph, participants, startsAt);
  if (ranked.length === 0) return { kind: "none", blockedBy: "time" };
  if (!trainsAt(graph, timetable, participants, startsAt)) {
    return { kind: "none", blockedBy: "no-trains" };
  }

  const rides = ridesFor(graph, timetable, startsAt);
  const crawls: Crawl[] = [];
  let missedLastTrain = false;
  let tried = 0;
  for (const first of ranked) {
    const starts = spotsNear(places, first.station, stops[0])
      .filter(({ place }) => openAt(place.hours, startsAt) !== "closed")
      .slice(0, firstSpotsTried);
    if (starts.length === 0) continue;
    if (tried === stationsTried) break;
    tried += 1;
    for (const start of starts) {
      const chain: CrawlStop[] = [
        {
          place: start.place,
          station: first.station,
          walkM: start.walkM,
          scheduledAt: startsAt,
          hours: openAt(start.place.hours, startsAt),
          leg: null,
        },
      ];
      const used = new Set([start.place.id]);
      for (const filters of stops.slice(1)) {
        const prev = chain[chain.length - 1];
        const next = nextStop(rides, places, prev, filters, stayMinutes, used);
        if (!next) break;
        chain.push(next);
        used.add(next.place.id);
      }
      if (chain.length < stops.length) continue;

      const last = chain[chain.length - 1];
      const leaveBy = participants.map((p) => ({
        participant: p.id,
        leaveBy: leaveByFor(
          timetable,
          startsAt,
          chain.map((s) => ({ station: s.station, at: s.place, walkM: s.walkM })),
          { station: p.station, at: p.home },
        ),
      }));
      const lastStayEnds = new Date(last.scheduledAt.getTime() + stayMinutes * minute);
      const tooLate = leaveBy.some(
        ({ leaveBy: l }) => l.kind === "train" && l.leaveBy < lastStayEnds,
      );
      if (tooLate) {
        missedLastTrain = true;
        continue;
      }
      crawls.push({ first, stops: chain, leaveBy });
      break;
    }
    if (crawls.length === optionCount) break;
  }
  if (crawls.length > 0) return { kind: "options", crawls };
  return { kind: "none", blockedBy: missedLastTrain ? "last-train" : "spots" };
}
