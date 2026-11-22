import { and, asc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { live } from "@/lib/rides";
import { travelTime, type TravelStep } from "@/lib/solver/travel";
import { metersWalked, milesOnT, stopsCount } from "@/lib/stats";
import { toMiles } from "@/lib/geo/miles";
import { stationIndex } from "@/lib/rides";
import { dayTypeOf, hourBucketOf, toServiceTime } from "@/lib/time";
import { data } from "@/server/data";
import type { Db } from "@/server/db/client";
import {
  badgesAwarded,
  checkins,
  planParticipants,
  planStops,
  plans,
  profiles,
  revealedCells,
  rideEvents,
} from "@/server/db/schema";

// A night's recap (F9.1): the arrival podium, badges, the group's numbers, everyone's route to
// the spot and the fog cleared that night. Facts only; A's recap page and the share image
// (F9.2, F9.3) draw them.

const earlyMs = 30 * 60_000;

export type Recap = {
  planId: string;
  title: string;
  startsAt: string;
  spot: { id: string; name: string; lat: number; lon: number; stationId: string };
  /** Everyone who checked in at the first stop, in arrival order (F9.1 shows 1st, 2nd and last). */
  arrivals: { profileId: string; name: string; at: string }[];
  badges: { profileId: string; name: string; badge: string }[];
  numbers: { milesOnT: number; milesWalked: number; stops: number; newCells: number };
  routes: { profileId: string; name: string; home: string; minutes: number; steps: TravelStep[] }[];
  /** Cells that left the fog during the night, for the map's reveal. */
  clearedCells: string[];
};

/**
 * The recap of an ended plan, or null when the plan doesn't exist or hasn't ended. Callers check
 * who may see it (F9.4).
 */
export async function recapOf(db: Db, planId: string): Promise<Recap | null> {
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
  if (!plan || plan.status !== "ended" || !plan.endedAt) return null;
  const [stop] = await db
    .select()
    .from(planStops)
    .where(eq(planStops.planId, planId))
    .orderBy(asc(planStops.seq))
    .limit(1);
  const place = stop ? data.places().find((p) => p.id === stop.placeId) : undefined;
  if (!stop || !place) return null;

  const people = await db
    .select({ id: profiles.id, name: profiles.displayName, home: profiles.homeStationId })
    .from(planParticipants)
    .innerJoin(profiles, eq(profiles.id, planParticipants.profileId))
    .where(and(eq(planParticipants.planId, planId), isNotNull(planParticipants.profileId)));
  const names = new Map(people.map((p) => [p.id, p.name]));
  const ids = people.map((p) => p.id);
  const from = new Date(plan.startsAt.getTime() - earlyMs);

  const [visits, awards, rides, cells] = await Promise.all([
    db
      .select()
      .from(checkins)
      .where(and(eq(checkins.planId, planId), eq(checkins.valid, true)))
      .orderBy(asc(checkins.ts)),
    db.select().from(badgesAwarded).where(eq(badgesAwarded.planId, planId)),
    db.select().from(rideEvents).where(eq(rideEvents.planId, planId)),
    ids.length === 0
      ? []
      : db
          .selectDistinct({ h3: revealedCells.h3 })
          .from(revealedCells)
          .where(
            and(
              inArray(revealedCells.profileId, ids),
              gte(revealedCells.firstAt, from),
              lte(revealedCells.firstAt, plan.endedAt),
            ),
          ),
  ]);

  const arrived = new Map<string, Date>();
  for (const visit of visits) {
    if (
      visit.placeId === stop.placeId &&
      names.has(visit.profileId) &&
      !arrived.has(visit.profileId)
    ) {
      arrived.set(visit.profileId, visit.ts);
    }
  }
  const checkedIn = new Set(visits.filter((v) => names.has(v.profileId)).map((v) => v.profileId));
  const station = data.stations().find((s) => s.id === stop.stationId) ?? null;
  // One stop: each person who checked in walked from the station and back (DATA 3.11).
  const walkedM = station
    ? checkedIn.size *
      metersWalked([{ station, spot: place, checkedIn: true, walkedFromPrevious: false }])
    : 0;
  const { serviceDate, seconds } = toServiceTime(plan.startsAt);

  return {
    planId,
    title: plan.title,
    startsAt: plan.startsAt.toISOString(),
    spot: {
      id: place.id,
      name: place.name,
      lat: place.lat,
      lon: place.lon,
      stationId: stop.stationId,
    },
    arrivals: [...arrived].map(([profileId, at]) => ({
      profileId,
      name: names.get(profileId) ?? "",
      at: at.toISOString(),
    })),
    badges: awards.map((a) => ({
      profileId: a.profileId,
      name: names.get(a.profileId) ?? "",
      badge: a.badgeId,
    })),
    numbers: {
      milesOnT: milesOnT(data.shapes(), stationIndex(data.stations()), live(rides)),
      milesWalked: toMiles(walkedM),
      stops: stopsCount(live(rides)),
      newCells: cells.length,
    },
    routes: people.flatMap((p) => {
      const trip = travelTime(
        data.graph(),
        p.home,
        stop.stationId,
        dayTypeOf(serviceDate),
        hourBucketOf(seconds),
      );
      return trip
        ? [
            {
              profileId: p.id,
              name: p.name,
              home: p.home,
              minutes: Math.round(trip.seconds / 60),
              steps: trip.steps,
            },
          ]
        : [];
    }),
    clearedCells: cells.map((c) => c.h3),
  };
}

/** Whether a profile sat in the plan, so it may see the recap (F9.4). */
export async function isParticipant(db: Db, planId: string, profileId: string): Promise<boolean> {
  const [seat] = await db
    .select({ id: planParticipants.id })
    .from(planParticipants)
    .where(and(eq(planParticipants.planId, planId), eq(planParticipants.profileId, profileId)))
    .limit(1);
  return seat !== undefined;
}
