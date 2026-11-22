import type { CrawlLeg, CrawlStop } from "@/lib/crawl";
import { walkM, walkMinutes, type LatLon } from "@/lib/geo/distance";
import type { Graph, Timetable } from "@/lib/gtfs/types";
import type { PuzzleEvent } from "@/lib/events";
import { leaveByFor, type LeaveBy } from "@/lib/lasttrain/leave-by";
import { openAt } from "@/lib/places/hours";
import type { Place } from "@/lib/places/types";
import {
  matchesFilters,
  rankStations,
  trainsAt,
  type Participant,
  type SpotFilters,
} from "@/lib/solver/fair";
import { travelTimesFrom, type Travel } from "@/lib/solver/travel";
import { dayTypeOf, hourBucketOf, toServiceTime } from "@/lib/time";

// "Dinner before" a puzzle event (F10.6, DATA 3.16): a 2-stop crawl. The first stop is the
// fairest spot within 10 minutes of the venue by walk or T, timed so the group leaves it in time
// for the event; the last stop is the event, and leave-by times run from its station.

const maxLegMinutes = 10;
const minute = 60_000;

export type DinnerBefore = {
  dinner: CrawlStop;
  /** The station the group rides to for dinner, with its fair score and each person's trip. */
  score: number;
  times: { participant: string; travel: Travel }[];
  event: { leg: CrawlLeg; scheduledAt: Date };
  leaveBy: { participant: string; leaveBy: LeaveBy }[];
};

export type DinnerBeforeResult =
  | { kind: "dinner"; plan: DinnerBefore }
  | { kind: "none"; blockedBy: "time" | "no-trains" | "spots" | "last-train" };

export type DinnerBeforeRequest = {
  participants: (Participant & { home: LatLon })[];
  event: PuzzleEvent;
  filters: SpotFilters;
  stayMinutes: number;
};

type Candidate = {
  place: Place;
  leg: CrawlLeg;
  station: { id: string; walkM: number };
  score: number;
  times: { participant: string; travel: Travel }[];
};

/** Fairest station first, then the shorter leg to the event, then name and ID. */
function byFairness(a: Candidate, b: Candidate): number {
  return (
    a.score - b.score ||
    a.leg.minutes - b.leg.minutes ||
    a.place.name.localeCompare(b.place.name) ||
    (a.place.id < b.place.id ? -1 : a.place.id > b.place.id ? 1 : 0)
  );
}

export function dinnerBefore(
  graph: Graph,
  timetable: Timetable,
  places: Place[],
  request: DinnerBeforeRequest,
): DinnerBeforeResult {
  const { participants, event, filters, stayMinutes } = request;
  const eventStart = new Date(event.startsAt);
  // Dinner starts at most a stay plus a full leg before the event; fairness and rides use then.
  const roughDinner = new Date(eventStart.getTime() - (stayMinutes + maxLegMinutes) * minute);
  const ranked = rankStations(graph, participants, roughDinner);
  if (ranked.length === 0) return { kind: "none", blockedBy: "time" };
  if (!trainsAt(graph, timetable, participants, roughDinner)) {
    return { kind: "none", blockedBy: "no-trains" };
  }
  const fair = new Map(ranked.map((r) => [r.station, r]));

  const { serviceDate, seconds } = toServiceTime(roughDinner);
  const dayType = dayTypeOf(serviceDate);
  const bucket = hourBucketOf(seconds);
  const toVenue = new Map<string, number | undefined>();
  const rideToVenue = (station: string) => {
    if (!toVenue.has(station)) {
      const travel = travelTimesFrom(graph, station, dayType, bucket).get(event.station.id);
      toVenue.set(station, station === event.station.id ? 0 : travel && travel.seconds / 60);
    }
    return toVenue.get(station);
  };

  const ordered: Candidate[] = [];
  for (const place of places) {
    if (!matchesFilters(place, filters)) continue;
    const walk = walkMinutes(walkM(place, event));
    let ride = Infinity;
    for (const near of place.stations) {
      const minutes = rideToVenue(near.id);
      if (minutes === undefined) continue;
      ride = Math.min(ride, walkMinutes(near.walkM) + minutes + walkMinutes(event.station.walkM));
    }
    const minutes = Math.min(walk, ride);
    if (minutes > maxLegMinutes) continue;
    const leg: CrawlLeg = { mode: walk <= ride ? "walk" : "T", minutes: Math.ceil(minutes) };
    for (const near of place.stations) {
      const station = fair.get(near.id);
      if (!station) continue;
      const candidate = { place, leg, station: near, score: station.score, times: station.times };
      ordered.push(candidate);
    }
  }
  ordered.sort(byFairness);

  let missedLastTrain = false;
  for (const candidate of ordered) {
    const dinnerAt = new Date(
      eventStart.getTime() - (stayMinutes + candidate.leg.minutes) * minute,
    );
    const hours = openAt(candidate.place.hours, dinnerAt);
    if (hours === "closed") continue;
    const leaveBy = participants.map((p) => ({
      participant: p.id,
      leaveBy: leaveByFor(
        timetable,
        dinnerAt,
        [
          { station: candidate.station.id, at: candidate.place, walkM: candidate.station.walkM },
          { station: event.station.id, at: event, walkM: event.station.walkM },
        ],
        { station: p.station, at: p.home },
      ),
    }));
    if (leaveBy.some(({ leaveBy: l }) => l.kind === "train" && l.leaveBy < eventStart)) {
      missedLastTrain = true;
      continue;
    }
    return {
      kind: "dinner",
      plan: {
        dinner: {
          place: candidate.place,
          station: candidate.station.id,
          walkM: candidate.station.walkM,
          scheduledAt: dinnerAt,
          hours,
          leg: null,
        },
        score: candidate.score,
        times: candidate.times,
        event: { leg: candidate.leg, scheduledAt: eventStart },
        leaveBy,
      },
    };
  }
  return { kind: "none", blockedBy: missedLastTrain ? "last-train" : "spots" };
}
